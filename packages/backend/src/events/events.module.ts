import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { WebSocketGateway } from './websocket.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, WebSocketGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
