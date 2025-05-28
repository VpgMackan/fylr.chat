import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AuthModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
