# PDF Ingestor for Fylr

A specialized Python-based ingestor for processing PDF files in the Fylr ecosystem. This service extracts text content from PDF files, generates vector embeddings, and stores them for semantic search capabilities.

## Features

- **PDF Processing**: Handles PDF files with advanced text extraction using the `unstructured` library
- **Enhanced Content Extraction**: 
  - Better layout preservation
  - Table extraction (converted to text representation)
  - Document structure recognition (headings, paragraphs, lists)
  - Multi-column layout handling
- **Vector Embeddings**: Generates embeddings using the AI Gateway
- **Chunking**: Intelligent text splitting with configurable chunk size and overlap
- **RabbitMQ Integration**: Consumes file processing jobs from message queue
- **S3 Storage**: Retrieves files from S3-compatible object storage
- **Status Updates**: Publishes real-time job status updates
- **Database Integration**: Stores vectors and metadata in PostgreSQL with pgvector

## Architecture

This ingestor is part of the Fylr microservices architecture:
- Listens for PDF file processing jobs on RabbitMQ
- Downloads files from S3 storage
- Extracts text using specialized PDF handlers
- Chunks text into manageable pieces
- Generates embeddings via AI Gateway
- Stores vectors in PostgreSQL database

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# S3 Storage Configuration
S3_ENDPOINT=your-s3-endpoint
S3_PORT=9000
S3_KEY_ID=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
S3_BUCKET_USER_FILE=user-files

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=fylr_user
DB_PASS=fylr_password
DB_NAME=fylr_db

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# AI Gateway
AI_GATEWAY_URL=http://localhost:8000

# Ingestor Configuration
INGESTOR_ROUTING_KEYS="pdf.v1"
INGESTOR_QUEUE_NAME="ingestor-queue-pdf-python-v1"
```

## Installation

### Using Poetry

```bash
poetry install
poetry run start
```

### Using Docker

```bash
docker build -t fylr-pdf-ingestor .
docker run --env-file .env fylr-pdf-ingestor
```

## Supported File Types

- PDF (.pdf)

## Processing Pipeline

1. **Job Reception**: Receives job from RabbitMQ with sourceId, s3Key, jobKey, and embeddingModel
2. **File Download**: Retrieves file from S3 storage
3. **Text Extraction**: Extracts text from PDF using unstructured library
4. **Text Chunking**: Splits text into chunks (1000 chars, 200 overlap)
5. **Embedding Generation**: Generates vector embeddings via AI Gateway
6. **Database Storage**: Stores vectors and updates source status
7. **Status Updates**: Publishes status updates throughout the process

## Dependencies

Key dependencies:
- `pika`: RabbitMQ client
- `boto3`: S3 client
- `unstructured`: PDF processing with advanced features
- `langchain-text-splitters`: Text chunking
- `sqlalchemy`: Database ORM
- `pgvector`: PostgreSQL vector extension

## Development

The ingestor is designed to be:
- **Scalable**: Multiple instances can run concurrently
- **Reliable**: Includes error handling and job status tracking
- **Maintainable**: Clean separation of concerns with handler pattern

## Error Handling

- Failed jobs are marked with FAILED status in database
- Error messages are published to events exchange
- Jobs are not requeued on failure (nack without requeue)
