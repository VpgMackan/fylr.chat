from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any, Union, Optional, Literal

# --- Chat Completion ---


class ReasoningConfig(BaseModel):
    """
    Configuration for reasoning/thinking tokens.
    Based on OpenRouter's unified reasoning parameter.
    """

    enabled: Optional[bool] = None  # Enable reasoning with default parameters
    effort: Optional[Literal["low", "medium", "high"]] = None  # OpenAI-style
    max_tokens: Optional[int] = None  # Anthropic-style
    exclude: Optional[bool] = None  # Exclude reasoning from response


class FunctionDefinition(BaseModel):
    """Function definition for tool calling."""

    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolDefinition(BaseModel):
    """Tool definition following OpenAI's format."""

    type: str = "function"
    function: FunctionDefinition


class ToolCall(BaseModel):
    """Represents a tool call made by the model."""

    id: str
    type: str = "function"
    function: Dict[str, Any]  # Contains 'name' and 'arguments'


class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None  # For tool response messages


class ChatCompletionRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    stream: bool = False
    options: Dict[str, Any] = Field(default_factory=dict)

    prompt_type: Optional[str] = None
    prompt_version: Optional[str] = None
    prompt_vars: Optional[Dict[str, Any]] = None

    user_id: Optional[str] = None

    # Tool calling support
    tools: Optional[List[ToolDefinition]] = None
    tool_choice: Optional[Union[str, Dict[str, Any]]] = (
        None  # "auto", "none", or specific tool
    )
    reasoning: Optional[Union[ReasoningConfig, bool]] = None

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
    fullModel: Optional[str] = None  # Format: timestamp@version@provider/model
    input: Union[str, List[str]]
    options: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[Dict[str, Any]]
    provider: str
    model: str
    usage: Dict[str, int]


class SetDefaultModelRequest(BaseModel):
    """Request to set a model as the default."""

    provider: str
    model: str


class DeprecateModelRequest(BaseModel):
    """Request to deprecate a model."""

    provider: str
    model: str
    deprecationDate: str  # ISO 8601 format
