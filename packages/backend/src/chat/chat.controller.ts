import {
  Req,
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
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';

import { CreateConversationDto } from './create-conversation.dto';
import { UpdateConversationDto } from './update-conversation.dto';

import { CreateMessageDto } from './create-message.dto';
import { UpdateMessageDto } from './update-message.dto';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private conversationService: ConversationService,
    private messageService: MessageService,
  ) {}

  // === CONVERSATIONS ===
  @Get('user/all')
  getConversationsByUser(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.conversationService.getConversationsByUserId(userId);
  }

  @Get(':pocketId/conversations')
  getConversations(
    @Param('pocketId') pocketId: string,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.conversationService.getConversations(pocketId, take, offset);
  }

  @Post(':pocketId/conversation')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createConversation(
    @Body() body: CreateConversationDto,
    @Param('pocketId') pocketId: string,
  ) {
    return this.conversationService.createConversation(body, pocketId);
  }

  @Get('conversation/:id')
  getConversation(@Param('id') id: string) {
    return this.conversationService.getConversation(id);
  }

  @Patch('conversation/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateConversation(
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return this.conversationService.updateConversation(body, id);
  }

  @Delete('conversation/:id')
  deletConversation(@Param('id') id: string) {
    return this.conversationService.deleteConversation(id);
  }

  // === MESSAGES ===
  @Get('conversation/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.messageService.getMessages(id);
  }

  @Post('conversation/:id/message')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createMessage(@Body() body: CreateMessageDto, @Param('id') id: string) {
    return this.messageService.createMessage(body, id);
  }

  @Get('message/:id')
  getMessage(@Param('id') id: string) {
    return this.messageService.getMessage(id);
  }

  @Post('message/:id/regenerate')
  regenerateMessage(@Param('id') id: string) {
    return this.messageService.processMessage(id);
  }

  @Patch('message/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateMessage(@Param('id') id: string, @Body() body: UpdateMessageDto) {
    return this.messageService.updateMessage(body, id);
  }

  @Delete('message/:id')
  deleteMessage(@Param('id') id: string) {
    return this.messageService.deleteMessage(id);
  }
}
