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
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { ConversationService } from './conversation.service';

import { CreateConversationDto, UpdateConversationDto } from '@fylr/types';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private conversationService: ConversationService) {}

  @Post('conversation/:id/ws-token')
  getWebSocketToken(
    @Request() req: RequestWithUser,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.generateWebSocketToken(
      req.user,
      conversationId,
    );
  }

  // === CONVERSATIONS ===
  @Get('conversations')
  getConversationsByUser(@Request() req: RequestWithUser) {
    return this.conversationService.getConversationsByUserId(req.user.id);
  }

  @Get(':pocketId/conversations')
  getConversations(
    @Param('pocketId') pocketId: string,
    @Request() req: RequestWithUser,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.conversationService.getConversations(
      pocketId,
      req.user.id,
      take,
      offset,
    );
  }

  @Post(':pocketId/conversation')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createConversation(
    @Body() body: CreateConversationDto,
    @Request() req: RequestWithUser,
    @Param('pocketId') pocketId: string,
  ) {
    return this.conversationService.createConversation(
      body,
      pocketId,
      req.user.id,
    );
  }

  @Get('conversation/:id')
  getConversation(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.conversationService.getConversation(id, req.user.id);
  }

  @Patch('conversation/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateConversation(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return this.conversationService.updateConversation(body, id, req.user.id);
  }

  @Delete('conversation/:id')
  deletConversation(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.conversationService.deleteConversation(id, req.user.id);
  }
}
