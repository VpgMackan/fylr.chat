import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ChatTokenPayload,
  UpdateMessageDto,
  WsClientActionPayload,
} from '@fylr/types';
import { MessageService } from './message.service';
import { SourceService } from 'src/source/source.service';
import { ConversationService } from './conversation.service';

interface SocketWithChatUser extends Socket {
  user: ChatTokenPayload;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly sourceService: SourceService,
  ) {}

  afterInit(server: Server) {
    server.use((socket: SocketWithChatUser, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('No token provided');

        const payload: ChatTokenPayload = this.jwtService.verify(token);
        if (!payload.conversationId) {
          return next(new Error('Unauthorized: Invalid chat token'));
        }
        socket.user = payload;
        return next();
      } catch (err) {
        return next(new Error(`Unauthorized: ${err.message}`));
      }
    });
  }

  handleConnection(client: SocketWithChatUser) {
    const username = client.user?.name;
    if (!username) {
      this.logger.warn(`Unauthenticated socket tried to connect: ${client.id}`);
      client.disconnect();
      return;
    }
    this.logger.log(`Client connected: ${client.id}, User: ${username}`);
  }

  handleDisconnect(client: SocketWithChatUser) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversationAction')
  async handleConversationAction(
    @ConnectedSocket() client: SocketWithChatUser,
    @MessageBody() data: WsClientActionPayload,
  ): Promise<void> {
    const { action, conversationId, ...payload } =
      typeof data === 'string' ? JSON.parse(data) : data;

    if (!conversationId) {
      throw new WsException('conversationId is required');
    }
    if (client.user.conversationId !== conversationId) {
      throw new WsException('Forbidden: Mismatched conversation ID');
    }

    switch (action) {
      case 'join':
        client.join(conversationId);
        this.logger.log(`Client ${client.id} joined room ${conversationId}`);
        const messages = await this.messageService.getMessages(conversationId);
        const sources = await this.sourceService.getSourcesByConversationId(
          conversationId,
          client.user.id,
        );
        const conversation = await this.conversationService.getConversation(
          conversationId,
          client.user.id,
        );
        const name = conversation.title;
        client.emit('conversationHistory', { messages, sources, name });
        break;

      case 'sendMessage':
        const { content } = payload as { content: string };
        if (!content) {
          throw new WsException('content is required for sendMessage action');
        }
        const userMessage = await this.messageService.createMessage(
          { role: 'user', content, metadata: {} },
          conversationId,
        );
        this.server.to(conversationId).emit('conversationAction', {
          action: 'newMessage',
          conversationId,
          data: userMessage,
        });
        this.messageService.generateAndStreamAiResponse(
          userMessage,
          this.server,
        );
        break;

      case 'deleteMessage':
        const { messageId: messageIdToDelete } = payload as {
          messageId: string;
        };
        await this.messageService.deleteMessage(messageIdToDelete);
        this.server.to(conversationId).emit('conversationAction', {
          action: 'messageDeleted',
          conversationId,
          data: { messageId: messageIdToDelete },
        });
        break;

      case 'updateMessage':
        const { messageId: messageIdToUpdate, content: newContent } =
          payload as { messageId: string; content: string };
        const updatedMessage = await this.messageService.updateMessage(
          { content: newContent },
          messageIdToUpdate,
        );
        this.server.to(conversationId).emit('conversationAction', {
          action: 'messageUpdated',
          conversationId,
          data: updatedMessage,
        });
        break;

      case 'regenerateMessage':
        const { messageId: messageIdToRegenerate } = payload as {
          messageId: string;
        };
        this.server.to(conversationId).emit('conversationAction', {
          action: 'messageDeleted',
          conversationId,
          data: { messageId: messageIdToRegenerate },
        });
        await this.messageService.regenerateAndStreamAiResponse(
          messageIdToRegenerate,
          this.server,
        );
        break;

      case 'updateSources':
        const { sourcesId } = payload as { sourcesId: string[] };
        try {
          await this.conversationService.updateSources(
            conversationId,
            sourcesId,
            client.user.id,
          );

          const updatedSources =
            await this.sourceService.getSourcesByConversationId(
              conversationId,
              client.user.id,
            );

          this.server.to(conversationId).emit('sourcesUpdated', updatedSources);
          break;
        } catch (error) {
          client.emit('error', { message: 'Failed to update sources' });
          throw new WsException('Failed to update sources');
        }

      default:
        throw new WsException(`Invalid action: ${action}`);
    }
  }
}
