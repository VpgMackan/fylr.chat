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
import { UserPayload } from 'src/auth/interfaces/request-with-user.interface';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';

interface ChatTokenPayload extends UserPayload {
  conversationId: string;
}

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
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: SocketWithChatUser, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('No token provided');

        const payload: ChatTokenPayload = this.jwtService.verify(token);
        if (!payload.conversationId) {
          return next(new Error('Unauthorized: Invalid chat token'));
        }
        socket.user = payload;
        next();
      } catch (err) {
        next(new Error('Unauthorized: ' + err.message));
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
    @MessageBody()
    data: {
      conversationId: string;
      action: 'join' | 'sendMessage';
      content?: string;
    },
  ) {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const { conversationId, action, content } = parsedData;

    if (!conversationId) {
      throw new WsException('conversationId is required');
    }

    if (client.user.conversationId !== conversationId) {
      throw new WsException('Forbidden: Mismatched conversation ID');
    }

    if (action === 'join') {
      client.join(conversationId);
      this.logger.log(`Client ${client.id} joined room ${conversationId}`);

      const messages = await this.messageService.getMessages(conversationId);
      client.emit('conversationHistory', messages);
    } else if (action === 'sendMessage') {
      if (!content) {
        throw new WsException('content is required for sendMessage action');
      }

      const userMessage = await this.messageService.createMessage(
        {
          role: 'user',
          content,
          metadata: {},
        },
        conversationId,
      );

      this.server.to(conversationId).emit('conversationAction', {
        action: 'newMessage',
        conversationId,
        data: userMessage,
      });

      this.messageService.generateAndStreamAiResponse(userMessage, this.server);
    } else {
      throw new WsException('Invalid action. Must be "join" or "sendMessage"');
    }
  }
}
