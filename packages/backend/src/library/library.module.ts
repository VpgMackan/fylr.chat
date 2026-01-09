import { Module } from '@nestjs/common';

import { AuthModule } from 'src/auth/auth.module';

import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { AiModule } from 'src/ai/ai.module';
import { RabbitMQService } from 'src/utils/rabbitmq.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [LibraryController],
  providers: [LibraryService, RabbitMQService],
})
export class LibraryModule {}
