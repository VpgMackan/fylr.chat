# Embedding Model Version Tracking & Ingestor Version Management

## Overview
This system tracks both embedding model versions (used for vectorization) and ingestor versions (used for extraction/processing) to enable intelligent re-ingestion when models are updated.

## Current Implementation Status

### What's Already in Place
- **Library Model Storage**: `Library.defaultEmbeddingModel` stores the embedding model identifier for the library
- **Source Version Stamps**: `Source.ingestorType` (e.g., "pdf-python", "text-python") and `Source.ingestorVersion` (e.g., "1.0.0") are recorded when sources are ingested
- **Queue Metadata**: When uploading files, `embeddingModel` is sent via RabbitMQ to the ingestor
- **Database Schema**: Vectors are stored in PostgreSQL with pgvector extension (1024-dimensional), linked to sources

### Ingestor Implementation Details
- **Text Ingestor** (`text-python-1`): Hardcoded version "1.0.0" when stamping sources
- **PDF Ingestor** (`pdf-python-1`): Hardcoded version "1.0.0" when stamping sources
- Both ingestors fetch embeddings from AI Gateway with the provided `embedding_model`
- Embedding model format is currently simple (e.g., "jina-clip-v2", no timestamp/version prefix)

## Model Format & Version Tracking

### Embedding Model Format (NEW)
The format should follow: `timestamp@version@provider/model`
- `timestamp`: ISO 8601 timestamp (e.g., "2025-01-07T10:30:00Z") - when model became available
- `version`: Semantic version (e.g., "1.0", "2.1.3") - model API/output version
- `provider`: Provider name (e.g., "jina", "ollama", "openai")
- `model`: Model identifier (e.g., "jina-clip-v2", "text-embedding-3-small")
- Examples: "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2", "2025-01-07T08:00:00Z@2.1.3@ollama/qwen-embedding-4b"

### Why This Format?
- **Timestamp**: Enables checking if a library's model is outdated by comparing timestamps
- **Version**: Tracks API/output schema changes (different versions = incompatible embeddings)
- **Provider/Model**: Identifies the actual model being used
- **Decoupling**: Ingestors don't need model logic; they just store what was used

### Model Registry Metadata
Each model in the registry stores:
- `provider`: string (e.g., "jina", "ollama")
- `model`: string (e.g., "jina-clip-v2")
- `version`: string (e.g., "1.0", "2.1.3")
- `timestamp`: ISO 8601 when this version became available
- `dimensions`: integer (embedding dimensions, e.g., 1024)
- `isDefault`: boolean (whether this is the default model to use for new libraries)
- `isDeprecated`: boolean (whether users should migrate away from this model)
- `deprecationDate`: ISO 8601 (when this model will no longer be accepted, null if not deprecated)

## What Needs to be Added

### 1. AI Gateway: Model Registry & Management

#### Configuration File (`models.yaml` or similar)
Located in AI Gateway config, defines all available models:
```yaml
models:
  - provider: jina
    model: jina-clip-v2
    version: "1.0"
    timestamp: "2025-01-07T10:30:00Z"
    dimensions: 1024
    isDefault: true
    isDeprecated: false
    deprecationDate: null
    
  - provider: jina
    model: jina-clip-v1
    version: "1.0"
    timestamp: "2024-12-01T08:00:00Z"
    dimensions: 768
    isDefault: false
    isDeprecated: true
    deprecationDate: "2025-03-01T00:00:00Z"
    
  - provider: ollama
    model: qwen-embedding-4b
    version: "1.0"
    timestamp: "2025-01-05T14:00:00Z"
    dimensions: 1024
    isDefault: false
    isDeprecated: false
    deprecationDate: null
```

#### New Endpoint: `GET /v1/embeddings/models`
Response format:
```json
{
  "models": [
    {
      "provider": "jina",
      "model": "jina-clip-v2",
      "version": "1.0",
      "timestamp": "2025-01-07T10:30:00Z",
      "dimensions": 1024,
      "isDefault": true,
      "isDeprecated": false,
      "deprecationDate": null,
      "fullModel": "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2"
    },
    // ... other models
  ],
  "default": "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2"
}
```

#### Admin Endpoint: `PATCH /v1/embeddings/models/default` (admin only)
Request:
```json
{
  "provider": "ollama",
  "model": "qwen-embedding-4b"
}
```
Response: Updated models list with new default

#### Deprecation Endpoint: `PATCH /v1/embeddings/models/deprecate` (admin only)
Request:
```json
{
  "provider": "jina",
  "model": "jina-clip-v1",
  "deprecationDate": "2025-03-01T00:00:00Z"
}
```
Effect: Sets `isDeprecated: true` and `deprecationDate` on the model

### 2. Backend: Dynamic Model Selection

#### Update Library Creation Flow
1. Fetch available models from AI Gateway via `GET /v1/embeddings/models`
2. Extract the `default` model from the response
3. Store the full model string in `Library.defaultEmbeddingModel`
4. Return the selected model to frontend

```typescript
// pseudo-code in library.service.ts
async createLibrary(data: CreateLibraryDto, userId: string) {
  // Fetch available models
  const modelsResponse = await this.aiGatewayService.getAvailableModels();
  const defaultModel = modelsResponse.default; // e.g., "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2"
  
  // Create library with default model
  return await this.prisma.library.create({
    data: {
      ...data,
      userId,
      defaultEmbeddingModel: defaultModel,
    },
  });
}
```

#### New Endpoint: `GET /libraries`
Returns all libraries with model status:
```json
{
  "libraries": [
    {
      "id": "lib-123",
      "title": "My Knowledge Base",
      "defaultEmbeddingModel": "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2",
      "modelInfo": {
        "provider": "jina",
        "model": "jina-clip-v2",
        "version": "1.0",
        "timestamp": "2025-01-07T10:30:00Z",
        "isDeprecated": false,
        "isDefault": true,
        "sourceCount": 42,
        "vectorCount": 1523
      },
      "sourcesCount": 5
    }
  ]
}
```

#### New Endpoint: `GET /libraries/{id}/available-models`
Shows all models and current library model:
```json
{
  "currentModel": "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2",
  "availableModels": [
    {
      "provider": "jina",
      "model": "jina-clip-v2",
      "version": "1.0",
      "timestamp": "2025-01-07T10:30:00Z",
      "isDefault": true,
      "isDeprecated": false,
      "canMigrateTo": true,
      "requiresMigration": false
    },
    {
      "provider": "ollama",
      "model": "qwen-embedding-4b",
      "version": "1.0",
      "timestamp": "2025-01-05T14:00:00Z",
      "isDefault": false,
      "isDeprecated": false,
      "canMigrateTo": true,
      "requiresMigration": false
    },
    {
      "provider": "jina",
      "model": "jina-clip-v1",
      "version": "1.0",
      "timestamp": "2024-12-01T08:00:00Z",
      "isDefault": false,
      "isDeprecated": true,
      "deprecationDate": "2025-03-01T00:00:00Z",
      "canMigrateTo": false,
      "requiresMigration": false  // because user already on v2
    }
  ],
  "deprecationAlert": null  // or { message: "Your model will be deprecated on 2025-03-01" }
}
```

#### New Endpoint: `POST /libraries/{id}/update-model`
Triggers model migration (re-ingestion) for a library:

Request:
```json
{
  "targetModel": "2025-01-05T14:00:00Z@1.0@ollama/qwen-embedding-4b"
}
```

Response:
```json
{
  "success": true,
  "message": "Re-ingestion started for 5 sources",
  "jobIds": ["job-1", "job-2", "job-3", "job-4", "job-5"],
  "library": {
    "id": "lib-123",
    "defaultEmbeddingModel": "2025-01-05T14:00:00Z@1.0@ollama/qwen-embedding-4b",
    "migrationStatus": "in_progress",
    "sourcesBeingReingested": 5,
    "reingestionStartedAt": "2025-01-07T11:00:00Z"
  }
}
```

#### Migration Logic
1. Validate target model exists and is not deprecated
2. Fetch all sources for the library
3. For each source:
   - Get all vectors and their content
   - Create a "reingest" job with the target model
   - Send to ingestor queue with `reingest: true` flag and `embeddingModel: targetModel`
4. Update `Source.reingestionStatus = "in_progress"`
5. Update `Library.defaultEmbeddingModel` to the new model
6. Return job IDs for progress tracking

#### Forced Deprecation Handling
When a model reaches its deprecation date:
1. Add endpoint `GET /libraries/requiring-migration` - returns all libraries using deprecated models
2. Add warning/alert to `GET /libraries/{id}` if using deprecated model
3. Option 1 (Soft): Display warning, suggest migration
4. Option 2 (Hard): On deprecation date, refuse ingestion of new files until library is migrated

### 3. Source/Ingestor Versioning Improvements
- **Dynamic Ingestor Version**: 
  - Current: Hardcoded "1.0.0" in ingestors
  - Change: Read from environment variable or configuration file during container startup
  - Allows versioning without code changes (container tag or config update)
- **Version Mismatch Detection**: 
  - Add comparison logic: if `Source.ingestorType` or `Source.ingestorVersion` differs from current ingestor version, mark for potential re-processing

## Database Schema Changes

```prisma
model Library {
  // existing fields...
  defaultEmbeddingModel String   // now stores: "timestamp@version@provider/model"
  migrationStatus       String?  // "in_progress", "completed", "failed" - for tracking re-ingestion
  reingestionStartedAt  DateTime? // when model migration was initiated
}

model Source {
  // existing fields...
  ingestorType        String?  // already exists: "pdf-python", "text-python"
  ingestorVersion     String?  // already exists: "1.0.0"
  embeddingModel      String?  // NEW: which model was used to generate these vectors (e.g., "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2")
  reingestionStatus   String?  // NEW: "pending", "in_progress", "completed", "failed"
  reingestionStartedAt DateTime?  // NEW: when re-ingestion job was queued
  reingestionCompletedAt DateTime? // NEW: when re-ingestion finished
}

model Vector {
  // existing fields...
  // (optional) embeddingModel could be added here for per-batch tracking, but not critical
}
```

## Implementation Phases

### Phase 1: Foundation (Required)
- Add model registry configuration file to AI Gateway (`models.yaml`)
- Create `/v1/embeddings/models` endpoint in AI Gateway
- Create admin endpoints to change default model and deprecate models
- Update backend library creation to fetch and store versioned model format
- Add re-ingestion status fields to Source schema via Prisma migration
- Create new RabbitMQ "reingest" job type

### Phase 2: Model Selection & Migration UI (Core)
- Implement `GET /libraries/{id}/available-models` endpoint
- Implement `POST /libraries/{id}/update-model` endpoint with re-ingestion logic
- Add `Source.embeddingModel` field to track which model generated each source's vectors
- Update ingestors to accept and process "reingest" jobs
- Add `GET /libraries` endpoint that returns model info alongside library data

### Phase 3: Re-ingestion Service (Infrastructure)
- Build library re-ingestion service that:
  1. Fetches all vectors for a source (by reading from database)
  2. Creates reingest jobs for each source with target model
  3. Publishes to RabbitMQ with `reingest: true` flag
  4. Updates `Source.reingestionStatus` to track progress
- Create ingestor handler for reingest jobs:
  1. Read existing vectors for source
  2. Extract text content from `Vector.content`
  3. Re-embed using target model from AI Gateway
  4. Update vectors with new embeddings
  5. Update source timestamp and completion status

### Phase 4: Deprecation & Monitoring (Enhancement)
- Implement deprecation warning logic
- Create `GET /libraries/requiring-migration` endpoint
- Add job to automatically notify users of deprecated models
- Implement forced migration option (reject new files on deprecated models)
- Add frontend UI to show deprecation warnings and migration status

### Phase 5: Optimizations (Future)
- Implement selective re-ingestion (batch processing of multiple sources)
- Add model compatibility matrix (define which models can be mixed/searched together)
- Implement automatic re-ingestion scheduling based on library settings
- Add cost estimation for re-ingestion (especially for large libraries)
- Support model rollback (keep previous model embeddings for comparison)

## Key Design Decisions

1. **Model Format in String**: Using a standardized string format allows versioning without schema changes, flexible storage, and easy API transmission

2. **Timestamp-Based Outdation**: Simpler than version comparison; timestamp comparison is unambiguous

3. **Registry in Config File**: YAML or JSON configuration allows easy admin updates without code changes or database migrations. Can be versioned alongside code/deployment.

4. **Default Model as Single Source of Truth**: 
   - AI Gateway defines which model is default via registry
   - All new libraries auto-use this default
   - Changing the default in AI Gateway automatically affects all new library creations
   - Existing libraries keep their model unless explicitly migrated

5. **Separation of Concerns**: 
   - Ingestors don't choose models; they use what's provided
   - Ingestors just store what was used (no logic needed)
   - Backend handles re-ingestion coordination

6. **Graceful Degradation**: 
   - Old sources without `embeddingModel` metadata can still work, just won't trigger migration alerts
   - Deprecated models still work (with warnings) until hard cutoff date

7. **Two-Phase Detection**: 
   - Check if model is outdated (timestamp comparison)
   - Check if ingestor is outdated (version comparison)
   - Either or both could trigger re-processing depending on use case

8. **User Choice for Migration**: 
   - Soft deprecation: warn user but allow continued use
   - Hard deprecation: force migration after cutoff date
   - Users can voluntarily upgrade to better models anytime

## Workflow Summary

### Admin Changes Default Model
1. Admin updates `models.yaml` in AI Gateway: changes `isDefault: true` on new model
2. Redeploy AI Gateway (or hot-reload configuration)
3. All **new** libraries created after this point use the new default model
4. **Existing** libraries keep their model until user manually migrates

### User Creates New Library
1. Frontend calls `POST /libraries`
2. Backend fetches `GET /v1/embeddings/models` from AI Gateway
3. Backend extracts the `default` model string
4. Backend creates library with `defaultEmbeddingModel = "2025-01-07T10:30:00Z@1.0@jina/jina-clip-v2"`
5. Frontend shows which model was selected

### User Sees Available Models
1. Frontend calls `GET /libraries/{id}/available-models`
2. Backend fetches current models from AI Gateway
3. Backend compares with library's current model
4. Response shows:
   - Current model (with indicator if deprecated)
   - All available models with migration flags
   - Deprecation warnings

### User Migrates to New Model
1. Frontend calls `POST /libraries/{id}/update-model` with target model
2. Backend validates target model exists and isn't deprecated
3. Backend queues reingest jobs for all sources in library
4. Each ingestor receives job with `{reingest: true, embeddingModel: newModel, sourceId, vectors: [...]}`
5. Ingestors:
   - Fetch existing vectors and content
   - Re-embed content with new model
   - Update database vectors
   - Mark source as reingestion complete
6. Frontend polls progress and shows completion

### Admin Forces Migration (Optional)
1. Admin calls `PATCH /v1/embeddings/models/deprecate` with deprecation date
2. Old model is marked `isDeprecated: true` with future cutoff date
3. Backend starts showing deprecation warnings to users
4. On cutoff date, backend can enforce:
   - Warn: Just display alert (recommended)
   - Block: Refuse new file uploads to libraries using deprecated model
   - Force: Automatically migrate all libraries (aggressive)