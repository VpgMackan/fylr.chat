export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
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

  abstract execute(args: any, context: ToolExecutionContext): Promise<any>;
}
