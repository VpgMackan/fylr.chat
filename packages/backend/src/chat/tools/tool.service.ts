import { Injectable } from '@nestjs/common';
import { BaseTool, ToolDefinition, ToolExecutionContext } from './base.tool';
import { SearchDocumentsTool } from './search-documents.tool';
import { ListSourcesTool } from './list-sources.tool';
import { ReadDocumentTool } from './read-document.tool';
import { WebSearchTool } from './web-search.tool';
import { FetchWebpageTool } from './fetch-webpage.tool';
import { withTimeout } from '../../utils/timeout.util';

@Injectable()
export class ToolService {
  private tools: Map<string, BaseTool> = new Map();
  private readonly TOOL_TIMEOUT_MS = 30000; // 30 seconds timeout for tool execution

  constructor(
    private readonly searchDocumentsTool: SearchDocumentsTool,
    private readonly listSourcesTool: ListSourcesTool,
    private readonly readDocumentTool: ReadDocumentTool,
    private readonly webSearchTool: WebSearchTool,
    private readonly fetchWebpageTool: FetchWebpageTool,
  ) {
    this.registerTool(this.searchDocumentsTool);
    this.registerTool(this.listSourcesTool);
    this.registerTool(this.readDocumentTool);
    this.registerTool(this.webSearchTool);
    this.registerTool(this.fetchWebpageTool);
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
      const availableTools = Array.from(this.tools.keys()).join(', ');
      throw new Error(
        `Tool "${name}" not found. Available tools: ${availableTools}`,
      );
    }

    try {
      console.log(
        `[ToolService] Executing tool: ${name} with args:`,
        JSON.stringify(args),
      );
      const startTime = Date.now();

      // Execute with timeout
      const result = await withTimeout(
        tool.execute(args, context),
        this.TOOL_TIMEOUT_MS,
        `Tool "${name}" execution timed out`,
      );

      const duration = Date.now() - startTime;
      console.log(`[ToolService] Tool ${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`[ToolService] Error executing tool ${name}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to execute tool "${name}": ${errorMessage}`);
    }
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
