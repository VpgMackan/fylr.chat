# Garage

## Config

#### **`docker-compose.yaml`**
```yaml
services:
  garage:
    image: dxflrs/garage:v1.1.0
    volumes:
      - ./garage.toml:/etc/garage.toml
      - garage_meta:/var/lib/garage/meta
      - garage_data:/var/lib/garage/data
    ports:
      - "3900:3900"
      - "3901:3901"
      - "3902:3902"
      - "3903:3903"
    restart: always

volumes:
  garage_meta:
  garage_data:
```

#### **`garage.toml`**
```toml
metadata_dir = "/tmp/meta"
data_dir = "/tmp/data"
db_engine = "sqlite"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "xxxx"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[k2v_api]
api_bind_addr = "[::]:3904"

[admin]
api_bind_addr = "[::]:3903"
admin_token = "xxxx"
metrics_token = "xxxx"
```

## Installation steps

1. Create a folder named `garage` and copy the **`docker-compose.yaml`** and **``garage.toml`** file into it.
2. Replace the xxxx in **`garage.toml`** with secure passwords.
3. Open a terminal in that folder and run:
   - `docker compose pull`
   - `docker compose up -d`
4. Now run the following commands to set up the required buckets and api keys.
   - `docker exec -ti garage /garage status`
   - `docker exec -ti garage /garage layout assign -z dc1 -c 100G <node_id>`
   - `docker exec -ti garage /garage layout apply --version 1`
   - `docker exec -ti garage /garage bucket create fylr.chat-sources`
   - `docker exec -ti garage /garage key create fylr.chat`
   - `docker exec -ti garage /garage bucket allow --read --write --owner fylr.chat-sources --key fylr-chat`

