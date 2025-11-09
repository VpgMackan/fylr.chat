import { Module } from '@nestjs/common';

import { RabbitMQService } from '../utils/rabbitmq.service';

import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

import { AuthModule } from 'src/auth/auth.module';
import { EventsModule } from 'src/events/events.module';
import { PermissionsService } from 'src/auth/permissions.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [SummaryController],
  providers: [SummaryService, RabbitMQService, PermissionsService],
  exports: [SummaryService],
})
export class SummaryModule {}
