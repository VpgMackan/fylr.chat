import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from 'src/ai/ai.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SourceModule } from 'src/source/source.module';
import { SearchDocumentsTool } from './search-documents.tool';
import { ListSourcesTool } from './list-sources.tool';
import { WebSearchTool } from './web-search.tool';
import { ToolService } from './tool.service';

@Module({
  imports: [HttpModule, AiModule, PrismaModule, SourceModule],
  providers: [SearchDocumentsTool, ListSourcesTool, WebSearchTool, ToolService],
  exports: [ToolService],
})
export class ToolsModule {}
