import { Module } from '@nestjs/common';

import { RabbitMQService } from '../utils/rabbitmq.service';

import { PodcastController } from './podcast.controller';
import { PodcastService } from './podcast.service';

import { AuthModule } from 'src/auth/auth.module';
import { EventsModule } from 'src/events/events.module';
import { S3Module } from 'src/common/s3/s3.module';
import { PermissionsService } from 'src/auth/permissions.service';

@Module({
  imports: [AuthModule, EventsModule, S3Module],
  controllers: [PodcastController],
  providers: [PodcastService, RabbitMQService, PermissionsService],
  exports: [PodcastService],
})
export class PodcastModule {}
