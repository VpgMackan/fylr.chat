export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolExecutionContext {
  conversationId: string;
  userId?: string;
  embeddingModel?: string;
}

export abstract class BaseTool {
  abstract getDefinition(): ToolDefinition;

  abstract execute(
    args: unknown,
    context: ToolExecutionContext,
  ): Promise<unknown>;
}
