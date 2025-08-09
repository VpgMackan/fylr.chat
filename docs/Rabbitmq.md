# Rabbitmq

## Config

#### **`docker-compose.yaml`**
```yaml
services:
  rabbitmq:
    image: rabbitmq:4-management
    container_name: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    restart: always
```

## Installation steps

1. Create a folder named `rabbitmq` and copy the **`docker-compose.yaml`** file into it.
2. Open a terminal in that folder and run:
   - `docker compose pull`
   - `docker compose up -d`
3. Access the RabbitMQ Management UI at [http://localhost:15672](http://localhost:15672)  
   - Login with username: `guest`, password: `guest`