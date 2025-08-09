# Pgvector

## Config

#### **`docker-compose.yaml`**
```yaml
services:
  db:
    image: pgvector/pgvector:pg17
    container_name: pgvector-db
    environment:
      POSTGRES_USER: xxxx
      POSTGRES_PASSWORD: xxxx
      POSTGRES_DB: test
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

volumes:
  pgdata:
    driver: local
```

## Installation steps

1. Create a folder named `pgvector` and copy the **`docker-compose.yaml`** file into it.
2. Add environment variables in the config.
3. Open a terminal in that folder and run:
   - `docker compose pull`
   - `docker compose up -d`
4. Add the password and user to following **`.env`**
   - **`packages/backend/.env`**
   - **`packages/file-ingestor/.env`**
   - **`packages/generator/.env`**
5. Run the following command in the folder **`packages/backend`** to sync the schemas
   - **`npx prisma db push`**