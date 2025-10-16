import { Module } from '@nestjs/common';

import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ChatGateway } from './chat.gateway';

import { AuthModule } from 'src/auth/auth.module';
import { AiModule } from 'src/ai/ai.module';
import { SourceModule } from 'src/source/source.module';
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [AuthModule, AiModule, SourceModule, ToolsModule],
  controllers: [ChatController],
  providers: [ConversationService, MessageService, ChatGateway],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChatModule {}
