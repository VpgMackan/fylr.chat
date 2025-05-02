import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiVectorService } from './vector.service';

@Module({
  providers: [AiService, AiVectorService],
  exports: [AiService],
})
export class AiModule {}
