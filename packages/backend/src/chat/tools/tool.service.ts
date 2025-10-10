import { Injectable } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { SearchDocumentsTool } from './search-documents.tool';
import { ListSourcesTool } from './list-sources.tool'

@Injectable()
export class ToolService {
  private tools: Map<string, BaseTool> = new Map();

  constructor(
    private readonly searchDocumentsTool: SearchDocumentsTool,
    private readonly listSourcesTool: ListSourcesTool,
  ) {
    this.registerTool(this.searchDocumentsTool);
    this.registerTool(this.listSourcesTool);
  }

  private registerTool(tool: BaseTool): void {
    const definition = tool.getDefinition();
    this.tools.set(definition.function.name, tool);
  }

  getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  async executeTool(
    name: string,
    args: any,
    context: ToolExecutionContext,
  ): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found.`);
    }

    console.log(`Executing tool: ${name} with args:`, args);
    return tool.execute(args, context);
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
