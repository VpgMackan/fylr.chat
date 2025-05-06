import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiVectorService } from './vector.service';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AiService, AiVectorService],
  exports: [AiService],
})
export class AiModule {}
