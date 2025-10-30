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
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly sourceService: SourceService,
  ) {}

  afterInit(server: Server) {
    // Provide server reference to ConversationService so it can trigger AI responses
    this.conversationService.setServer(server);

    server.use((socket: SocketWithChatUser, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('No token provided');

        const payload: ChatTokenPayload = this.jwtService.verify(token, {
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        });
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
    const rooms = Array.from(client.rooms).filter((room) => room !== client.id);
    rooms.forEach((room) => {
      client.leave(room);
    });
    this.logger.log(
      `Client disconnected: ${client.id} (left ${rooms.length} rooms)`,
    );
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
      case 'join': {
        const rooms = Array.from(client.rooms).filter(
          (room) => room !== client.id,
        );
        rooms.forEach((room) => {
          client.leave(room);
          this.logger.log(`Client ${client.id} left room ${room}`);
        });

        client.join(conversationId);
        this.logger.log(`Client ${client.id} joined room ${conversationId}`);
        const messages =
          await this.messageService.getMessagesWithThoughts(conversationId);
        const sources = await this.sourceService.getSourcesByConversationId(
          conversationId,
          client.user.id,
        );
        const conversation = await this.conversationService.getConversation(
          conversationId,
          client.user.id,
        );
        const name = conversation.title;
        const metadata = conversation.metadata;
        client.emit('conversationHistory', {
          messages,
          sources,
          name,
          metadata,
        });
        break;
      }

      case 'sendMessage': {
        try {
          const {
            content,
            sourceIds,
            libraryIds,
            agenticMode,
            webSearchEnabled,
          } = payload as {
            content: string;
            sourceIds?: string[];
            libraryIds?: string[];
            agenticMode?: boolean;
            webSearchEnabled?: boolean;
          };

          // Log the received agenticMode value for debugging
          this.logger.log(
            `SendMessage - agenticMode received: ${agenticMode} (type: ${typeof agenticMode})`,
          );

          // Handle both sourceIds and libraryIds
          if (
            (sourceIds && sourceIds.length > 0) ||
            (libraryIds && libraryIds.length > 0)
          ) {
            try {
              const existingSourceIds =
                await this.conversationService.getConversationSourceIds(
                  conversationId,
                  client.user.id,
                );

              // Collect new source IDs
              let newSourceIds: string[] = [];

              // Add direct source IDs
              if (sourceIds && sourceIds.length > 0) {
                newSourceIds = [...sourceIds];
              }

              // Fetch and add sources from libraries
              if (libraryIds && libraryIds.length > 0) {
                const librarySources =
                  await this.sourceService.getSourcesByLibraryIds(
                    libraryIds,
                    client.user.id,
                  );
                newSourceIds = [
                  ...newSourceIds,
                  ...librarySources.map((s) => s.id),
                ];
              }

              // Combine with existing sources and remove duplicates
              const allSourceIds = [
                ...new Set([...existingSourceIds, ...newSourceIds]),
              ];

              await this.conversationService.updateSources(
                conversationId,
                allSourceIds,
                client.user.id,
              );

              const updatedSources =
                await this.sourceService.getSourcesByConversationId(
                  conversationId,
                  client.user.id,
                );
              this.server
                .to(conversationId)
                .emit('sourcesUpdated', updatedSources);
            } catch (error) {
              this.logger.error(
                `Failed to add sources to conversation ${conversationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              client.emit('conversationAction', {
                action: 'streamError',
                conversationId,
                data: {
                  message:
                    'Failed to add sources to conversation. The message will still be sent.',
                },
              });
            }
          }

          if (!content) {
            throw new WsException('content is required for sendMessage action');
          }

          // Update conversation metadata with the current agenticMode and webSearchEnabled settings
          const useAgenticMode = agenticMode !== false; // Default to true
          // Web search is only available in agentic mode
          const useWebSearch = useAgenticMode && webSearchEnabled === true;
          await this.conversationService.updateConversation(
            {
              metadata: {
                agenticMode: useAgenticMode,
                webSearchEnabled: useWebSearch,
              },
            },
            conversationId,
            client.user.id,
          );

          const userMessage = await this.messageService.createMessage(
            {
              role: 'user',
              content: content,
              metadata: {
                agenticMode: useAgenticMode,
                webSearchEnabled: useWebSearch,
              }, // Store mode and web search in metadata
            },
            conversationId,
          );
          this.server.to(conversationId).emit('conversationAction', {
            action: 'newMessage',
            conversationId,
            data: userMessage,
          });

          // Execute AI response generation without awaiting to not block
          // Use agenticMode flag to determine which method to call (default to true for agentic)

          this.logger.log(
            `Using ${useAgenticMode ? 'AGENTIC' : 'RAG'} mode for conversation ${conversationId}`,
          );

          if (useAgenticMode) {
            this.messageService
              .generateAndStreamAiResponseWithTools(userMessage, this.server)
              .catch((error) => {
                this.logger.error(
                  `Error generating AI response for conversation ${conversationId}:`,
                  error,
                );
                this.server.to(conversationId).emit('conversationAction', {
                  action: 'streamError',
                  conversationId,
                  data: {
                    message:
                      'Failed to generate AI response. Please try again.',
                  },
                });
              });
          } else {
            this.messageService
              .generateAndStreamAiResponse(userMessage, this.server)
              .catch((error) => {
                this.logger.error(
                  `Error generating AI response for conversation ${conversationId}:`,
                  error,
                );
                this.server.to(conversationId).emit('conversationAction', {
                  action: 'streamError',
                  conversationId,
                  data: {
                    message:
                      'Failed to generate AI response. Please try again.',
                  },
                });
              });
          }
        } catch (error) {
          this.logger.error('Error in sendMessage handler:', error);
          client.emit('conversationAction', {
            action: 'streamError',
            conversationId,
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to send message',
            },
          });
          throw error;
        }
        break;
      }

      case 'deleteMessage': {
        try {
          const { messageId } = payload as {
            messageId: string;
          };

          // Get the message before deleting to check if it's a user message
          const message = await this.messageService.getMessage(messageId);

          if (message && message.role === 'user') {
            // Find all child messages (thoughts, tool calls, and responses) linked to this user message
            const childMessages = await this.messageService[
              'prisma'
            ].message.findMany({
              where: {
                parentMessageId: messageId,
              },
              select: { id: true },
            });

            // Delete the user message (this will cascade delete child messages due to onDelete: Cascade in schema)
            await this.messageService.deleteMessage(messageId);

            // Emit deletion events for the user message
            this.server.to(conversationId).emit('conversationAction', {
              action: 'messageDeleted',
              conversationId,
              data: { messageId },
            });

            // Emit deletion events for all child messages
            for (const msg of childMessages) {
              this.server.to(conversationId).emit('conversationAction', {
                action: 'messageDeleted',
                conversationId,
                data: { messageId: msg.id },
              });
            }
          } else {
            // Just delete the single message (assistant response or thought)
            await this.messageService.deleteMessage(messageId);
            this.server.to(conversationId).emit('conversationAction', {
              action: 'messageDeleted',
              conversationId,
              data: { messageId },
            });
          }
        } catch (error) {
          this.logger.error('Error in deleteMessage handler:', error);
          client.emit('conversationAction', {
            action: 'streamError',
            conversationId,
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete message',
            },
          });
          throw error;
        }
        break;
      }

      case 'updateMessage': {
        try {
          const { messageId, content: newContent } = payload as {
            messageId: string;
            content: string;
          };
          const updatedMessage = await this.messageService.updateMessage(
            { content: newContent },
            messageId,
          );
          this.server.to(conversationId).emit('conversationAction', {
            action: 'messageUpdated',
            conversationId,
            data: updatedMessage,
          });
        } catch (error) {
          this.logger.error('Error in updateMessage handler:', error);
          client.emit('conversationAction', {
            action: 'streamError',
            conversationId,
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to update message',
            },
          });
          throw error;
        }
        break;
      }

      case 'regenerateMessage': {
        try {
          // Handle both direct messageId and nested payload structure
          const messageId = payload.messageId || payload.payload?.messageId;

          if (!messageId) {
            this.logger.error(
              'regenerateMessage: messageId is missing',
              payload,
            );
            throw new WsException(
              'messageId is required for regenerateMessage action',
            );
          }

          this.server.to(conversationId).emit('conversationAction', {
            action: 'messageDeleted',
            conversationId,
            data: { messageId },
          });

          // Execute regeneration without awaiting
          this.messageService
            .regenerateAndStreamAiResponse(messageId, this.server)
            .catch((error) => {
              this.logger.error(
                `Error regenerating message ${messageId}:`,
                error,
              );
              this.server.to(conversationId).emit('conversationAction', {
                action: 'streamError',
                conversationId,
                data: {
                  message: 'Failed to regenerate message. Please try again.',
                },
              });
            });
        } catch (error) {
          this.logger.error('Error in regenerateMessage handler:', error);
          client.emit('conversationAction', {
            action: 'streamError',
            conversationId,
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to regenerate message',
            },
          });
          throw error;
        }
        break;
      }

      case 'updateSources': {
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
      }

      default:
        throw new WsException(`Invalid action: ${action}`);
    }
  }
}
