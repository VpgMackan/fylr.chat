import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AiService } from './ai.service';

import { AiVectorService } from './vector.service';
import { LLMService } from './llm.service';

@Module({
  imports: [HttpModule],
  providers: [AiService, AiVectorService, LLMService],
  exports: [AiService],
})
export class AiModule {}
