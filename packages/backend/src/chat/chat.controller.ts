import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './create-conversation.dto';
import { UpdateConversationDto } from './update-conversation.dto';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  // === CONVERSATIONS ===
  @Get(':pocketId/conversations')
  getConversations(@Param('pocketId') pocketId: string) {
    return this.chatService.getConversations(pocketId);
  }

  @Post(':pocketId/conversation')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createConversation(
    @Body() body: CreateConversationDto,
    @Param('pocketId') pocketId: string,
  ) {
    return this.chatService.createConversation(body, pocketId);
  }

  @Get('conversation/:id')
  getConversation(@Param('id') id: string) {
    return this.chatService.getConversation(id);
  }

  @Patch('conversation/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateConversation(
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(body, id);
  }

  @Delete('conversation/:id')
  deletConversation(@Param('id') id: string) {
    return this.chatService.deleteConversation(id);
  }

  // === MESSAGES ===
  @Get('conversation/:id/messages')
  getMessages() {}

  @Post('conversation/:id/message')
  createMessage() {
    // Store message in database
    // Ask llm for rag question based on chat and context
    // Get the sources
    // Send all of the information to a LLM
    // Send resonse to user / Stream if possible
  }

  @Get('message/:id')
  getMessage() {}

  @Post('message/:id/regenerate')
  regenerateMessage() {}

  @Patch('message/:id')
  updateMessage() {}

  @Delete('message/:id')
  deleteMessage() {}
}
