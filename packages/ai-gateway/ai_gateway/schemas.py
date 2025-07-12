from pydantic import BaseModel, Field
from typing import List, Dict, Any, Union

# --- Chat Completion ---


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    provider: str
    model: str
    messages: List[ChatMessage]
    stream: bool = False
    options: Dict[str, Any] = Field(default_factory=dict)


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


# --- Embeddings ---


class EmbeddingRequest(BaseModel):
    provider: str
    model: str
    input: Union[str, List[str]]
    options: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[Dict[str, Any]]
    model: str
    usage: Dict[str, int]
