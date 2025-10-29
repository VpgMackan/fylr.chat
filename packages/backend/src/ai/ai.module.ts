import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AiVectorService } from './vector.service';
import { LLMService } from './llm.service';
import { RerankingService } from './reranking.service';

@Module({
  imports: [HttpModule],
  providers: [AiVectorService, LLMService, RerankingService],
  exports: [AiVectorService, LLMService, RerankingService],
})
export class AiModule {}
