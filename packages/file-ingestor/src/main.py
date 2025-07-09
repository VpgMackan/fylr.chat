import pika, sys, os, boto3
from botocore.config import Config


def main():
    s3 = boto3.resource(
        "s3",
        aws_access_key_id="GK9768b127266b42f6f30de32a",
        aws_secret_access_key="442a85b3e0bc85a7fa7f2cd19fb343b480ae5103569b868a247de4930fd5cf42",
        region_name="garage",
        endpoint_url="http://172.19.84.193:3900",
        config=Config(s3={"addressing_style": "path"}),
    )
    bucket = s3.Bucket("fylr.chat-sources")

    connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
    channel = connection.channel()

    def callback(ch, method, properties, body):
        file_key = body.decode("utf-8").strip('"')
        print(f" [x] Processing file: {file_key}")
        try:
            obj = bucket.Object(file_key)
            print(f" [x] Attempting to fetch object with key: {file_key}")
            file_content = obj.get()["Body"].read()
        except Exception as e:
            print(f" [!] Error processing file {file_key}: {e}")

    channel.queue_declare("file-processing", False, True)
    channel.basic_consume(
        queue="file-processing", on_message_callback=callback, auto_ack=True
    )

    print(" [*] Waiting for messages. To exit press CTRL+C")
    channel.start_consuming()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted")
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
