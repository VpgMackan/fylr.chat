# Architecture Overview

Fylr.Chat is built on a microservices architecture to ensure scalability, maintainability, and separation of concerns. The components communicate via REST APIs for synchronous actions and a RabbitMQ message broker for asynchronous background tasks.

### Component Breakdown

#### 1. Web Frontend (`packages/web`)

-   **Technology**: Next.js, React, TypeScript, Tailwind CSS.
-   **Responsibilities**: Provides the complete user interface for registration, login, creating pockets, uploading files, chatting with the AI, and viewing summaries. It communicates exclusively with the Backend API.

#### 2. Backend API (`packages/backend`)

-   **Technology**: NestJS, TypeScript, Prisma.
-   **Responsibilities**:
    -   Acts as the central orchestrator and primary API gateway for the frontend.
    -   Manages user authentication and authorization (JWT).
    -   Handles all CRUD operations for Pockets, Sources, Conversations, and Summaries.
    -   For long-running tasks like file processing or summary generation, it publishes messages to RabbitMQ to be picked up by the appropriate worker.
    -   Manages real-time communication with the frontend via Socket.IO for chat and status updates.

#### 3. AI Gateway (`packages/ai-gateway`)

-   **Technology**: Python, FastAPI.
-   **Responsibilities**:
    -   Provides a unified, internal API for accessing different AI models.
    -   Abstracts the specific logic for various LLM and embedding providers (e.g., OpenAI, Jina).
    -   Manages a registry of prompt templates (`hyde`, `final_rag`, `summary`, etc.) to standardize interactions with LLMs.
    -   This component allows the rest of the system to be model-agnostic.

#### 4. File Ingestor (`packages/file-ingestor`)

-   **Technology**: Python.
-   **Responsibilities**:
    -   A worker that consumes `file-processing` messages from RabbitMQ.
    -   Downloads the corresponding file from S3 storage.
    -   Parses the file content based on its MIME type (PDF, Markdown, etc.).
    -   Splits the content into manageable chunks.
    -   Calls the AI Gateway to generate vector embeddings for each chunk.
    -   Saves the chunks and their embeddings to the Pgvector database.

#### 5. Generator (`packages/generator`)

-   **Technology**: Python.
-   **Responsibilities**:
    -   A worker that consumes `summary-generator` messages from RabbitMQ.
    -   Retrieves the relevant summary request from the database.
    -   For each episode in the summary, it performs a vector search against the database to find relevant document chunks.
    -   Constructs a detailed prompt with the retrieved context and calls the AI Gateway to generate the summary content.
    -   Updates the summary and its episodes in the database with the generated content.

### Core Workflows

#### File Upload & Ingestion

1.  User uploads a file via the **Web UI**.
2.  The **Backend API** receives the file, creates a `Source` record in the database with `QUEUED` status, and uploads the raw file to **S3 Storage**.
3.  The **Backend** publishes a message to the `file-processing` queue in **RabbitMQ**, containing the source ID and file location.
4.  The **File Ingestor** worker consumes the message, downloads the file from S3, chunks it, and calls the **AI Gateway** to get embeddings.
5.  The **File Ingestor** saves the vectorized chunks to the **Pgvector** database and updates the source's status to `COMPLETED`.

#### Chat (Retrieval-Augmented Generation)

1.  User sends a message in the **Web UI**.
2.  The **Backend API** receives the message via a WebSocket connection.
3.  The **Backend** calls the **AI Gateway** with a `hyde` prompt to generate a hypothetical answer, which is great for semantic search.
4.  The **Backend** uses the hypothetical answer to query the **Pgvector** database for the most relevant document chunks.
5.  The **Backend** calls the **AI Gateway** again, this time with a `final_rag` prompt that includes the original question, chat history, and the retrieved document chunks as context.
6.  The **AI Gateway** returns a streaming response, which the **Backend** forwards to the **Web UI** in real-time.