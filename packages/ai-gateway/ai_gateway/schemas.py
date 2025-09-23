from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any, Union, Optional

# --- Chat Completion ---


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    stream: bool = False
    options: Dict[str, Any] = Field(default_factory=dict)

    prompt_type: Optional[str] = None
    prompt_version: Optional[str] = None
    prompt_vars: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def set_provider_and_validate_model(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sets the default provider to 'auto' if none is given.
        Ensures that if a specific provider (not 'auto') is chosen,
        a model is also specified.
        """
        provider = values.get("provider")
        model = values.get("model")

        if not provider:
            provider = "auto"
            values["provider"] = provider

        if provider != "auto" and not model:
            raise ValueError(
                f"The 'model' field is required when provider is '{provider}'."
            )

        return values


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


# --- Embeddings ---


class EmbeddingRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    input: Union[str, List[str]]
    options: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[Dict[str, Any]]
    provider: str
    model: str
    usage: Dict[str, int]
