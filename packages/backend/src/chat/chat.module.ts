import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';

import { AuthModule } from 'src/auth/auth.module';
import { AiModule } from 'src/aiService/aiService.module';
import { SourceModule } from 'src/source/source.module';

import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    AuthModule,
    AiModule,
    SourceModule,
  ],
  controllers: [ChatController],
  providers: [ConversationService, MessageService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChatModule {}
