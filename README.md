# Fylr.Chat

Fylr.Chat is a powerful, self-hostable alternative to services like NotebookLM, designed for in-depth analysis and querying of large document collections. Upload your documents, and leverage AI to ask questions, generate summaries, and uncover insights from your private knowledge base.

## Features

-   **AI-Powered Q&A**: Ask natural language questions about your documents and receive context-aware, cited answers.
-   **Multi-Format Document Upload**: Process various file types including PDF, text, and markdown.
-   **Content Summarization**: Generate detailed, multi-part summaries from the content of your document collections.
-   **Data Organization**: Group related documents into "Pockets" for organized analysis.
-   **Asynchronous Processing**: A robust queue-based system handles file ingestion and content generation without blocking the user interface.

---

## Quick Start

This guide will get you up and running quickly. For a more detailed walkthrough, see the [**Local Development Setup Guide**](./docs/setup.md).

### Prerequisites

-   Node.js (v18+), npm (v9+)
-   Docker and Docker Compose
-   Python (v3.12+), Poetry

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/VpgMackan/fylr.chat
cd fylr.chat

# Install all Node.js dependencies
npm install

# Install all Python dependencies
cd packages/ai-gateway && poetry install && cd ../..
cd packages/file-ingestor && poetry install && cd ../..
cd packages/generator && poetry install && cd ../..
```

### 2. Configure & Launch Infrastructure

1.  Follow the instructions in the [Setup Guide](./docs/setup.md) to create the necessary `docker-compose.yml` and `garage.toml` files in the project root.
2.  Start the services:
    ```bash
    docker-compose up -d
    ```
3.  Configure the S3 bucket as described in the setup guide.

### 3. Configure Environment & Database

1.  Copy all `.env.example` files to `.env` in their respective packages.
2.  Fill out the `.env` files with your credentials (database, S3 keys, etc.). See the [Environment Variables Reference](./docs/env_variables.md) for details.
3.  Apply the database schema:
    ```bash
    # Run from the packages/backend directory
    npx prisma db push
    ```

### 4. Run The Application

1.  **Start Workers** (in separate terminals):
    ```bash
    # AI Gateway
    cd packages/ai-gateway && poetry run gateway

    # File Ingestor
    cd packages/file-ingestor && poetry run ingest

    # Summary Generator
    cd packages/generator && poetry run generator
    ```

2.  **Start Backend & Web** (from the root directory):
    ```bash
    npm run dev
    ```

Your application is now available at `http://localhost:3000`.

---

## Project Structure

This project is a monorepo containing several packages:

-   `packages/web`: The Next.js frontend application.
-   `packages/backend`: The NestJS backend API that serves as the central orchestrator.
-   `packages/ai-gateway`: A FastAPI service that provides a unified interface to AI models.
-   `packages/file-ingestor`: A Python worker for processing and embedding uploaded files.
-   `packages/generator`: A Python worker for generating summaries.
-   `packages/types`: Shared TypeScript types and DTOs used across the backend and frontend.
-   `docs`: Contains detailed documentation on architecture, setup, and more.

For more details, see the [**Architecture Overview**](./docs/architecture.md).