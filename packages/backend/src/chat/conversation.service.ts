import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  CreateConversationDto,
  UpdateConversationDto,
  UserPayload,
} from '@fylr/types';

import { AuthService } from 'src/auth/auth.service';
import { MessageService } from './message.service';
import { Server } from 'socket.io';
import { AgentFactory, AgentMode } from './strategies/strategies.factory';
import { withSpan, setSpanAttributes } from 'src/common/telemetry/tracer';

@Injectable()
export class ConversationService {
  private server: Server;

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private messageService: MessageService,
    private agentFactory: AgentFactory,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async ensureLibrariesShareEmbeddingModel(
    libraryIds: string[] | undefined,
    userId: string,
    conversationId?: string,
  ): Promise<string | null> {
    const ids = (libraryIds ?? []).filter(Boolean);

    if (ids.length === 0 && !conversationId) {
      return null;
    }

    const libraries = ids.length
      ? await this.prisma.library.findMany({
          where: { id: { in: ids }, userId },
          select: { id: true, defaultEmbeddingModel: true },
        })
      : [];

    if (libraries.length !== ids.length) {
      throw new BadRequestException(
        'Some libraries were not found or are not accessible.',
      );
    }

    const models = new Set<string>();

    libraries.forEach((library) => {
      if (library.defaultEmbeddingModel) {
        models.add(library.defaultEmbeddingModel);
      }
    });

    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        select: {
          sources: {
            select: {
              library: {
                select: { id: true, defaultEmbeddingModel: true },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new ForbiddenException('Conversation not found or access denied.');
      }

      conversation.sources.forEach((source) => {
        const model = source.library?.defaultEmbeddingModel;
        if (model) {
          models.add(model);
        }
      });
    }

    if (models.size > 1) {
      throw new BadRequestException(
        'Selected libraries use different embedding models. Please migrate libraries with the migration tool before combining them.',
      );
    }

    return models.values().next().value ?? null;
  }

  async generateWebSocketToken(
    user: UserPayload,
    conversationId: string,
  ): Promise<{ token: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId: user.id,
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Access to this conversation is denied.');
    }

    const token = await this.authService.generateChatToken(
      user,
      conversationId,
    );
    return { token };
  }

  async getConversationsByUserId(userId: string) {
    try {
      return await this.prisma.conversation.findMany({
        where: {
          userId,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve conversations for user ${userId}: ${error.message}`,
      );
    }
  }

  async createConversation(body: CreateConversationDto, userId: string) {
    try {
      if (typeof body.metadata === 'string') {
        try {
          body.metadata = JSON.parse(body.metadata);
        } catch (parseError) {
          throw new InternalServerErrorException(
            'Invalid JSON format in metadata',
          );
        }
      }

      await this.ensureLibrariesShareEmbeddingModel(
        body.libraryIds,
        userId,
      );

      // Collect all source IDs from both sourceIds and libraryIds
      let allSourceIds: string[] = [];

      // Add direct source IDs if provided
      if (body.sourceIds && body.sourceIds.length > 0) {
        allSourceIds = [...body.sourceIds];
      }

      // Fetch sources from libraries if library IDs are provided
      if (body.libraryIds && body.libraryIds.length > 0) {
        const librarySources = await this.prisma.source.findMany({
          where: {
            libraryId: { in: body.libraryIds },
            library: { userId },
          },
          select: { id: true },
        });
        allSourceIds = [...allSourceIds, ...librarySources.map((s) => s.id)];
      }

      // Validate all sources exist and belong to the user
      if (allSourceIds.length > 0) {
        const sources = await this.prisma.source.findMany({
          where: {
            id: { in: allSourceIds },
            library: { userId },
          },
        });

        if (sources.length !== allSourceIds.length) {
          throw new BadRequestException(
            'Some sources not found or not accessible',
          );
        }
      }

      return await this.prisma.conversation.create({
        data: {
          userId,
          title: body.title,
          metadata: body.metadata,
          sources:
            allSourceIds.length > 0
              ? {
                  connect: allSourceIds.map((id) => ({ id })),
                }
              : undefined,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create conversation: ${error.message}`,
      );
    }
  }

  async initiateConversation(
    content: string,
    userId: string,
    agentMode: AgentMode,
    sourceIds?: string[],
    libraryIds?: string[],
    webSearchEnabled?: boolean,
  ) {
    return withSpan(
      'conversation.initiate',
      async (span) => {
        await this.ensureLibrariesShareEmbeddingModel(
          libraryIds,
          userId,
        );

        let allSourceIds: string[] = [];

        if (sourceIds && sourceIds.length > 0) {
          allSourceIds = [...sourceIds];
        }

        if (libraryIds && libraryIds.length > 0) {
          const librarySources = await this.prisma.source.findMany({
            where: {
              libraryId: { in: libraryIds },
              library: { userId },
            },
            select: { id: true },
          });
          allSourceIds = [...allSourceIds, ...librarySources.map((s) => s.id)];
        }

        if (allSourceIds.length > 0) {
          const sources = await this.prisma.source.findMany({
            where: {
              id: { in: allSourceIds },
              library: { userId },
            },
          });

          if (sources.length !== allSourceIds.length) {
            throw new BadRequestException(
              'Some sources not found or not accessible',
            );
          }
        }

        const useWebSearch = webSearchEnabled === true;

        setSpanAttributes({
          userId,
          agentMode,
          source_count: allSourceIds.length,
          webSearchEnabled: useWebSearch,
          content_length: content.length,
        });

        const newConversation = await this.prisma.conversation.create({
          data: {
            userId,
            title: content.split(' ').slice(0, 5).join(' ') + '...',
            metadata: {
              agentMode,
              webSearchEnabled: useWebSearch,
            },
            sources:
              allSourceIds.length > 0
                ? { connect: allSourceIds.map((id) => ({ id })) }
                : undefined,
          },
          include: {
            sources: {
              include: {
                library: {
                  select: { defaultEmbeddingModel: true },
                },
              },
            },
          },
        });

        setSpanAttributes({ conversationId: newConversation.id });

        if (this.server) {
          const userMessage = await this.messageService.createMessage(
            {
              role: 'user',
              content,
              metadata: {
                agentMode,
                webSearchEnabled: useWebSearch,
              },
            },
            newConversation.id,
          );

          const agent = await this.agentFactory.getStrategy(agentMode, userId);

          agent
            .execute(userMessage, newConversation, this.server)
            .catch((error) => {
              console.error(
                `Failed to generate AI response for conversation ${newConversation.id}:`,
                error,
              );
              this.server.to(newConversation.id).emit('conversationAction', {
                action: 'streamError',
                conversationId: newConversation.id,
                data: {
                  message: 'Failed to generate AI response. Please try again.',
                },
              });
            });
        }

        return newConversation;
      },
      { userId, agentMode },
    );
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied.');
    }
    return conversation;
  }

  async getConversationWithSources(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        sources: {
          include: {
            library: {
              select: { defaultEmbeddingModel: true },
            },
          },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied.');
    }
    return conversation;
  }

  async getConversationSourceIds(
    conversationId: string,
    userId: string,
  ): Promise<string[]> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { sources: { select: { id: true } } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied.');
    }
    return conversation.sources.map((s) => s.id);
  }

  async updateConversation(
    body: UpdateConversationDto,
    id: string,
    userId: string,
  ) {
    try {
      await this.getConversation(id, userId);
      return await this.prisma.conversation.update({
        where: { id },
        data: body,
        include: {
          sources: {
            include: {
              library: {
                select: { defaultEmbeddingModel: true },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update conversation ${id}`,
      );
    }
  }

  async updateSources(
    conversationId: string,
    sourcesId: string[],
    userId: string,
  ) {
    const sources = await this.prisma.source.findMany({
      where: {
        id: { in: sourcesId },
        library: { userId },
      },
    });

    if (sources.length !== sourcesId.length) {
      throw new BadRequestException('Some sources not found or not accessible');
    }

    return await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        sources: {
          set: sourcesId.map((id) => ({ id })),
        },
      },
    });
  }

  async deleteConversation(id: string, userId: string) {
    try {
      await this.getConversation(id, userId);
      return await this.prisma.conversation.delete({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete conversation ${id}`,
      );
    }
  }
}
