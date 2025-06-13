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
import { Server } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SocketWithUser, WsAuthGuard } from 'src/auth/ws-auth.guard';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';

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
    server.use(async (socket: SocketWithUser, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('No token provided');
        const payload = this.jwtService.verify(token); // throws if invalid
        socket.user = payload; // attach to socket
        next();
      } catch (err) {
        next(new Error('Unauthorized: ' + err.message));
      }
    });
  }

  handleConnection(client: SocketWithUser) {
    const username = client.user?.name;
    if (!username) {
      this.logger.warn(`Unauthenticated socket tried to connect: ${client.id}`);
      client.disconnect();
      return;
    }
    this.logger.log(`Client connected: ${client.id}, User: ${username}`);
  }

  handleDisconnect(client: SocketWithUser) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversationAction')
  async handleConversationAction(
    @ConnectedSocket() client: SocketWithUser,
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
