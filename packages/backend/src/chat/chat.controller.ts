import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { ChatService } from './chat.service';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}
  // # Conversations General
  // Get all conversations
  @Get('/conversations')
  getConversations() {}

  // Get all messags
  @Get('/conversation/:id/messages')
  getMessages() {}

  // # Conversation
  // Create Convo
  @Post('/conversation')
  createConversation() {}

  // Delete Convo
  @Delete('/conversation/:id')
  deletConversation() {}

  // Update Convo (Pocket ID, Metadata, Title)
  @Patch('/conversation/:id')
  updateConversation() {}

  // Read Convo + msg
  @Get('/conversation/:id')
  getConversation() {}

  // #Messages
  // Create Message
  @Post('/message')
  createMessage() {
    // Store message in database
    // Ask llm for rag question based on chat and context
    // Get the sources
    // Send all of the information to a LLM
    // Send resonse to user / Stream if possible
  }

  // Get Message
  @Get('/message/:id')
  getMessage() {}

  // Regenerate
  @Post('/message/:id/regenerate')
  regenerateMessage() {}

  // Delete Message
  @Delete('/message/:id')
  deleteMessage() {}

  // Update Message (Metadata, Content)
  @Patch('/message/:id')
  updateMessage() {}
}
