from abc import ABC


class BaseProvider(ABC):
    def generate_embeddings(self, chunk, model, options):
        print(
            "WARNING: this provider doesn't provide support for generating embeddigns"
        )

    def generate_text(self, prompt, model, options):
        print("WARNING: this provider doesn't provide support for generating text")
