# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used across the Fylr.Chat services.

---

### Backend (`packages/backend/.env`)

| Variable              | Description                                                                                             | Example Value                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`            | The runtime environment.                                                                                | `development`                                                                   |
| `DATABASE_URL`        | **Required.** The full connection string for the PostgreSQL database.                                   | `postgresql://fylr_user:fylr_password@localhost:5432/fylr_db?schema=public`     |
| `S3_ENDPOINT`         | **Required.** The hostname of the S3-compatible storage.                                                | `localhost`                                                                     |
| `S3_PORT`             | **Required.** The port for the S3-compatible storage.                                                   | `3900`                                                                          |
| `S3_KEY_ID`           | **Required.** The Access Key ID for S3 storage (from Garage setup).                                     | `garage_access_key`                                                             |
| `S3_SECRET_KEY`       | **Required.** The Secret Access Key for S3 storage (from Garage setup).                                 | `garage_secret_key`                                                             |
| `S3_REGION`           | The S3 region. For Garage, this is typically a fixed value.                                             | `garage`                                                                        |
| `S3_BUCKET_USER_FILE` | **Required.** The name of the S3 bucket where user files are stored.                                    | `fylr.chat-sources`                                                             |
| `S3_BUCKET_PODCAST_AUDIO` | **Required.** The name of the S3 bucket where podcast audio files are stored.                       | `fylr.chat-podcasts`                                                            |
| `JWT_SECRET`          | **Required.** A long, random, secret string for signing JWTs.                                           | `a_very_secure_and_random_string`                                               |
| `JWT_EXPIRY`          | The expiration time for JWTs.                                                                           | `3600s`                                                                         |
| `TEMP_FILE_DIR`       | A temporary directory for handling file uploads before they go to S3.                                   | `upload_tmp`                                                                    |
| `PORT`                | The port on which the backend server will run.                                                          | `3001`                                                                          |
| `AI_GATEWAY_URL`      | **Required.** The full URL of the AI Gateway service.                                                   | `http://localhost:8000`                                                         |
| `RABBITMQ_URL`        | **Required.** The connection URL for the RabbitMQ server.                                               | `amqp://guest:guest@localhost:5672`                                             |

---

### AI Gateway (`packages/ai-gateway/.env`)

| Variable         | Description                                                        | Example Value                                  |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `OPENAI_API_KEY` | Your API key for OpenAI or a compatible service (like LiteLLM).    | `sk-xxxxxxxxxxxxxxxxxxxxxxxx`                  |
| `JINA_API_KEY`   | Your API key for Jina AI (used for embeddings).                    | `jina_xxxxxxxxxxxxxxxxxxxxxxxx`                |
| `JINA_API_URL`   | The base URL for the Jina AI API.                                  | `https://api.jina.ai/v1`                         |

---

### File Ingestor (`packages/file-ingestor/.env`)

| Variable        | Description                                                          | Example Value           |
| --------------- | -------------------------------------------------------------------- | ----------------------- |
| `S3_ENDPOINT`   | **Required.** The hostname of the S3 storage.                        | `localhost`             |
| `S3_PORT`       | **Required.** The port for the S3 storage.                           | `3900`                  |
| `S3_KEY_ID`     | **Required.** The S3 Access Key ID.                                  | `garage_access_key`     |
| `S3_SECRET_KEY` | **Required.** The S3 Secret Access Key.                              | `garage_secret_key`     |
| `S3_REGION`     | The S3 region.                                                       | `garage`                |
| `AI_GATEWAY_URL`| **Required.** The URL of the AI Gateway service.                     | `http://localhost:8000` |
| `DB_HOST`       | **Required.** The hostname of the PostgreSQL database.               | `localhost`             |
| `DB_PORT`       | **Required.** The port of the PostgreSQL database.                   | `5432`                  |
| `DB_USER`       | **Required.** The username for the database.                         | `fylr_user`             |
| `DB_PASS`       | **Required.** The password for the database.                         | `fylr_password`         |
| `DB_NAME`       | **Required.** The name of the database.                              | `fylr_db`               |
| `RABBITMQ_HOST` | **Required.** The hostname of the RabbitMQ server.                   | `localhost`             |

---

### Generator (`packages/generator/.env`)

| Variable       | Description                                      | Example Value           |
| -------------- | ------------------------------------------------ | ----------------------- |
| `DB_HOST`      | **Required.** The hostname of the PostgreSQL database. | `localhost`             |
| `DB_PORT`      | **Required.** The port of the PostgreSQL database.     | `5432`                  |
| `DB_USER`      | **Required.** The username for the database.     | `fylr_user`             |
| `DB_PASS`      | **Required.** The password for the database.     | `fylr_password`         |
| `DB_NAME`      | **Required.** The name of the database.          | `fylr_db`               |
| `AI_GATEWAY_URL`| **Required.** The URL of the AI Gateway service. | `http://localhost:8000` |

---

### Web (`packages/web/.env`)

| Variable              | Description                                      | Example Value           |
| --------------------- | ------------------------------------------------ | ----------------------- |
| `NEXT_PUBLIC_API_URL` | **Required.** The full URL of the Backend API.   | `http://localhost:3001` |