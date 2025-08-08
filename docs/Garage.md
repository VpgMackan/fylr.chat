docker-compose.yaml
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

garage.toml
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