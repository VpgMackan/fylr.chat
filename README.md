# Fylr.Chat

Fylr.Chat is a powerful, self-hostable alternative to services like NotebookLM, designed for in-depth analysis and querying of your document collections. Upload your documents and leverage AI to ask questions, generate content, and uncover insights from your private knowledge base.

## Features

-   **AI-Powered Q&A**: Ask natural language questions about your documents and receive context-aware, cited answers using either RAG or an advanced Agentic mode with tools.
-   **Multi-Format Document Upload**: Process various file types including PDF, DOCX, PPTX, Markdown, and plain text.
-   **Content Generation**: Create detailed, multi-part summaries or full-length conversational podcast episodes (complete with audio) from your source material.
-   **Data Organization**: Group related documents into "Libraries" for organized analysis and easy context selection in chats.
-   **Asynchronous Processing**: A robust queue-based system handles file ingestion and content generation, with real-time progress updates visible in the UI.
-   **FREE & PRO Tiers**: Built-in support for different user levels with configurable usage limits and premium features like AI-powered search reranking.

> ✨ **Explore the Documentation!**
>
> For a full guide on setup, architecture, and features, please visit the **[Official Fylr.Chat GitHub Wiki](https://github.com/VpgMackan/fylr.chat/wiki)**.

---

## Quick Start

This guide provides the essential steps to get the application running locally. For a detailed walkthrough, please see the **[Local Development Setup Guide](https://github.com/VpgMackan/fylr.chat/wiki/Local-Development-Setup-Guide)** on our Wiki.

### Prerequisites

-   Node.js (v18+), npm (v9+)
-   Docker and Docker Compose
-   Python (v3.12+), Poetry

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/VpgMackan/fylr.chat
cd fylr.chat

# Install all Node.js dependencies from the root
npm install

# Install all Python dependencies for the microservices
cd packages/ai-gateway && poetry install && cd ../..
cd packages/generator && poetry install && cd ../..
cd packages/ingestor/ingestors/text-python-1 && poetry install && cd ../../../..
```

### 2. Configure & Launch Infrastructure

1.  Follow the **[Local Development Setup Guide](https://github.com/VpgMackan/fylr.chat/wiki/Local-Development-Setup-Guide)** on the Wiki to set up your Docker environment (PostgreSQL, RabbitMQ, S3) and configure your S3 buckets.
2.  Start the services:
    ```bash
    docker-compose up -d
    ```

### 3. Configure Environment & Database

1.  Copy all `.env.example` files to `.env` in their respective packages.
2.  Fill out the `.env` files with your credentials (database, S3 keys, AI provider keys, etc.).
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

    # File Ingestor (Text/PDF/Markdown/etc.)
    cd packages/ingestor/ingestors/text-python-1 && poetry run ingest

    # Content Generator (Summaries/Podcasts)
    cd packages/generator && poetry run generator
    ```

2.  **Start Backend & Web** (from the root directory):
    ```bash
    npm run dev
    ```

Your application is now available at `http://localhost:3000`.

---

## Project Structure

This project is a monorepo containing several microservices and shared packages:

-   `packages/web`: The Next.js frontend application.
-   `packages/backend`: The NestJS backend API that serves as the central orchestrator.
-   `packages/ai-gateway`: A FastAPI service that provides a unified interface to various AI models.
-   `packages/ingestor`: Contains versioned worker services for processing and embedding uploaded files.
-   `packages/generator`: A Python worker for generating summaries and podcasts.
-   `packages/types`: Shared TypeScript types and DTOs used across the backend and frontend.

For a more detailed explanation, please see the **[Architecture Overview](https://github.com/VpgMackan/fylr.chat/wiki/Architecture-Overview)** on our Wiki.