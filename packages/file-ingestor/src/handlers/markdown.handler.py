supported_types = [
    "text/plain",
    "text/markdown",
    "application/octet-stream",
]


def handle(buffer: bytes) -> str:
    print("Handling markdown file")
