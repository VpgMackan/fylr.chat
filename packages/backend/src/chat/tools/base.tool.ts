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
  pocketId: string;
  conversationId: string;
  userId?: string;
}

export abstract class BaseTool {
  abstract getDefinition(): ToolDefinition;

  abstract execute(args: any, context: ToolExecutionContext): Promise<any>;
}
