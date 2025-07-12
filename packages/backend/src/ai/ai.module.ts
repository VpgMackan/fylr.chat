import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AiVectorService } from './vector.service';
import { LLMService } from './llm.service';

@Module({
  imports: [HttpModule],
  providers: [AiVectorService, LLMService],
  exports: [AiVectorService, LLMService],
})
export class AiModule {}
