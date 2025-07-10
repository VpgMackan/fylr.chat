import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [WebSocketGateway],
})
export class EventsModule {}
