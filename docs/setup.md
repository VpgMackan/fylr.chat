# Local Development Setup Guide

This guide provides a detailed, step-by-step process for setting up the Fylr.Chat application on your local machine.

### Prerequisites

-   **Node.js**: Version 18 or higher.
-   **npm**: Version 9 or higher.
-   **Docker** and **Docker Compose**: For running infrastructure services.
-   **Python**: Version 3.12 or higher.
-   **Poetry**: For managing Python dependencies (`pip install poetry`).

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/VpgMackan/fylr.chat
cd fylr.chat
```

---

### Step 2: Set Up Infrastructure with Docker

1.  **Create `docker-compose.yml`**: In a dedicated folder for docker, create a `docker-compose.yml` file with the following content. This file defines the database, message broker, and S3-compatible storage services.

    ```yaml
    # docker-compose.yml
    services:
      db:
        image: pgvector/pgvector:pg16
        container_name: pgvector-db
        environment:
          POSTGRES_USER: fylr_user
          POSTGRES_PASSWORD: fylr_password
          POSTGRES_DB: fylr_db
        volumes:
          - pgdata:/var/lib/postgresql/data
        ports:
          - "5432:5432"
        restart: always

      rabbitmq:
        image: rabbitmq:3-management
        container_name: rabbitmq
        ports:
          - "5672:5672"
          - "15672:15672"
        restart: always

      garage:
        image: dxflrs/garage:v0.8.1
        container_name: garage
        volumes:
          - ./garage.toml:/etc/garage.toml
          - garage_meta:/var/lib/garage/meta
          - garage_data:/var/lib/garage/data
        ports:
          - "3900:3900"
          - "3901:3901"
          - "3903:3903"
        restart: always

    volumes:
      pgdata:
      garage_meta:
      garage_data:
    ```

2.  **Create `garage.toml`**: In a dedicated folder for docker, create a `garage.toml` file. **Replace `CHANGE_ME_SECRET` and `CHANGE_ME_ADMIN_TOKEN` with secure, unique values.**

    ```toml
    # garage.toml
    metadata_dir = "/var/lib/garage/meta"
    data_dir = "/var/lib/garage/data"
    db_engine = "sqlite"
    replication_mode = "none"
    rpc_bind_addr = "[::]:3901"
    rpc_public_addr = "127.0.0.1:3901"
    rpc_secret = "CHANGE_ME_SECRET"

    [s3_api]
    s3_region = "garage"
    api_bind_addr = "[::]:3900"

    [admin]
    api_bind_addr = "[::]:3903"
    admin_token = "CHANGE_ME_ADMIN_TOKEN"
    ```

3.  **Launch Docker Containers**:
    ```bash
    docker-compose up -d
    ```

---

### Step 3: Configure S3 (Garage) Storage

After the containers are running, you must initialize the S3 bucket.

1.  **Get Node ID**:
    ```bash
    docker-compose exec garage garage status
    ```
2.  **Assign Layout**: Replace `<node_id>` with the ID from the previous command.
    ```bash
    docker-compose exec garage garage layout assign -z dc1 -c 100G <node_id>
    docker-compose exec garage garage layout apply --version 1
    ```
3.  **Create Bucket**:
    ```bash
    docker-compose exec garage garage bucket create fylr.chat-sources
    ```
4.  **Create API Key**:
    ```bash
    docker-compose exec garage garage key create fylr.chat
    docker-compose exec garage garage bucket allow --read --write --owner fylr.chat-sources --key fylr.chat
    ```
    **Important**: Save the generated `Access Key ID` and `Secret Access Key`. You will need them in the next step.

---

### Step 4: Install Dependencies

```bash
# Install root and all workspace Node.js dependencies from the project root
npm install

# Install Python dependencies for each service
cd packages/ai-gateway && poetry install && cd ../..
cd packages/file-ingestor && poetry install && cd ../..
cd packages/generator && poetry install && cd ../..
```

---

### Step 5: Configure Environment Variables

For each package that has a `.env.example` file, create a corresponding `.env` file.

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/ai-gateway/.env.example packages/ai-gateway/.env
cp packages/file-ingestor/.env.example packages/file-ingestor/.env
cp packages/generator/.env.example packages/generator/.env
cp packages/web/.env.example packages/web/.env
```

Now, edit each `.env` file and fill in the appropriate values (database credentials, S3 keys, etc.). Refer to the **[Environment Variables Reference](./env_variables.md)** for a detailed explanation of each variable.

---

### Step 6: Apply Database Schema

Once your `packages/backend/.env` file is configured with the correct `DATABASE_URL`, run the Prisma migration to set up the database schema.

```bash
# Run from the packages/backend directory
cd packages/backend
npx prisma db push
cd ../..
```

---

### Step 7: Run the Application

1.  **Start the Python Workers**: Open three separate terminals.

    ```bash
    # Terminal 1: AI Gateway
    cd packages/ai-gateway && poetry run gateway

    # Terminal 2: File Ingestor
    cd packages/file-ingestor && poetry run ingest

    # Terminal 3: Summary Generator
    cd packages/generator && poetry run generator
    ```

2.  **Start the Backend and Web UI**: In a new terminal, run the following command from the project root.
    ```bash
    npm run dev
    ```

---

### Step 8: Access Services

Your Fylr.Chat instance is now running!

-   **Web Application**: `http://localhost:3000`
-   **Backend API**: `http://localhost:3001`
-   **RabbitMQ Management**: `http://localhost:15672` (user: `guest`, pass: `guest`)