# Ingestor Integration Guide

## Overview

This document explains how the new versioned ingestor system is integrated with the backend and how the message routing works.

## Architecture

### Message Flow

```
User uploads file
    ↓
Backend (source.service.ts)
    ↓
RabbitMQ Exchange: file-processing-exchange
    ↓ (routing by MIME type)
    ├─ pdf.v1 → ingestor-queue-text-python-v1
    ├─ markdown.v1 → ingestor-queue-text-python-v1
    └─ text.v1 → ingestor-queue-text-python-v1
    ↓
Ingestor (text-python-1)
    ↓
Process & Store Embeddings
    ↓
RabbitMQ Exchange: fylr-events
    ↓
Backend receives status updates
```

## RabbitMQ Configuration

### Exchanges

1. **file-processing-exchange** (Topic Exchange)
   - Purpose: Routes file processing jobs to appropriate ingestors
   - Type: Topic
   - Durable: Yes

2. **fylr-events** (Topic Exchange)
   - Purpose: Broadcasts status updates and events
   - Type: Topic
   - Durable: Yes

### Routing Keys

The backend maps MIME types to routing keys:

| MIME Type | Routing Key | Ingestor |
|-----------|-------------|----------|
| `application/pdf` | `pdf.v1` | text-python-1 |
| `text/markdown` | `markdown.v1` | text-python-1 |
| `text/plain` | `text.v1` | text-python-1 |
| `application/x-markdown` | `markdown.v1` | text-python-1 |

### Queue Bindings

The `text-python-1` ingestor binds its queue to multiple routing keys:
```python
INGESTOR_ROUTING_KEYS="pdf.v1,markdown.v1,text.v1"
INGESTOR_QUEUE_NAME="ingestor-queue-text-python-v1"
```

## Backend Implementation

### RabbitMQService

The `RabbitMQService` provides a dedicated method for publishing file processing jobs:

```typescript
async publishFileProcessingJob(data: {
  sourceId: string;
  s3Key: string;
  mimeType: string;
  jobKey: string;
  embeddingModel: string;
})
```

This method:
1. Maps the MIME type to a routing key
2. Publishes to `file-processing-exchange`
3. Uses the determined routing key for smart routing

### SourceService

When a file is uploaded, the `SourceService`:
1. Uploads the file to S3
2. Creates a database entry with status `QUEUED`
3. Calls `publishFileProcessingJob()` to dispatch the job

## Ingestor Implementation

### text-python-1 Ingestor

Located at: `packages/ingestor/ingestors/text-python-1/`

**Capabilities:**
- PDF processing (via PyMuPDF)
- Markdown processing
- Plain text processing
- Text chunking with RecursiveCharacterTextSplitter
- Embedding generation via AI Gateway
- Vector storage in PostgreSQL with pgvector

**Environment Configuration:**
```bash
INGESTOR_ROUTING_KEYS="pdf.v1,markdown.v1,text.v1"
INGESTOR_QUEUE_NAME="ingestor-queue-text-python-v1"
```

**Status Updates:**
The ingestor publishes status updates to `fylr-events` exchange:
- `STARTING`: Processing started
- `FETCHING`: Downloading from S3
- `PARSING`: Extracting text from file
- `VECTORIZING`: Chunking and embedding
- `COMPLETED`: Successfully processed
- `FAILED`: Error occurred

## Adding New Ingestors

To add a new ingestor (e.g., for image processing):

1. **Create a new ingestor directory:**
   ```
   packages/ingestor/ingestors/image-python-1/
   ```

2. **Define unique routing keys:**
   ```bash
   INGESTOR_ROUTING_KEYS="image.v1,png.v1,jpg.v1"
   INGESTOR_QUEUE_NAME="ingestor-queue-image-python-v1"
   ```

3. **Update RabbitMQService routing:**
   Add MIME type mappings in `getRoutingKeyForMimeType()`:
   ```typescript
   'image/png': 'png.v1',
   'image/jpeg': 'jpg.v1',
   ```

4. **Implement the ingestor:**
   - Listen on your queue
   - Process messages with the expected structure
   - Publish status updates to `fylr-events`
   - Update database with results

## Benefits of This Architecture

1. **Scalability**: Multiple ingestor instances can process different file types in parallel
2. **Versioning**: Easy to deploy new versions alongside old ones
3. **Type-based Routing**: Files automatically route to the correct processor
4. **Decoupling**: Ingestors and backend are loosely coupled via messaging
5. **Observability**: Status updates provide real-time feedback
6. **Fault Tolerance**: Failed messages can be requeued or sent to dead-letter queues

## Monitoring

### Backend Logs
```bash
[RabbitMQ] Published file processing job to exchange 'file-processing-exchange' with routing key 'pdf.v1'
```

### Ingestor Logs
```bash
Binding queue 'ingestor-queue-text-python-v1' to routing key 'pdf.v1'
Ingestor online. Listening on queue 'ingestor-queue-text-python-v1'...
[job-123] Status: STARTING - Processing started.
```

## Troubleshooting

### Problem: Files not being processed

**Check:**
1. Is the ingestor running?
2. Are the routing keys correctly configured?
3. Is RabbitMQ accessible?
4. Check backend logs for publishing confirmation
5. Check ingestor logs for queue binding

### Problem: Wrong ingestor processing file

**Check:**
1. MIME type mapping in `getRoutingKeyForMimeType()`
2. Routing keys in ingestor `.env` file
3. Queue bindings in RabbitMQ management UI

## Future Improvements

- [ ] Add metrics collection for processing times
- [ ] Implement priority queuing for urgent files
- [ ] Add support for batch processing
- [ ] Create health check endpoints for ingestors
- [ ] Implement automatic scaling based on queue depth
