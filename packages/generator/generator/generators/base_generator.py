from abc import ABC, abstractmethod


class BaseGenerator(ABC):
    @abstractmethod
    def generate(self, ch, method, properties, body: bytes):
        pass

    @abstractmethod
    def validate_input(self, input_data):
        pass
