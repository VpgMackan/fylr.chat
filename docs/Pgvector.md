docker-compose.yaml
```yaml
services:
  db:
    image: pgvector/pgvector:pg17
    container_name: pgvector-db
    environment:
      POSTGRES_USER: xxxx
      POSTGRES_PASSWORD: xxxx
      POSTGRES_DB: xxxx
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

volumes:
  pgdata:
    driver: local
```