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
    // Collect all source IDs from both sourceIds and libraryIds
    let allSourceIds: string[] = [];

    // Add direct source IDs if provided
    if (sourceIds && sourceIds.length > 0) {
      allSourceIds = [...sourceIds];
    }

    // Fetch sources from libraries if library IDs are provided
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

    // Web search is only available in agentic mode
    const useWebSearch = webSearchEnabled === true;

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

    if (this.server) {
      const userMessage = await this.messageService.createMessage(
        {
          role: 'user',
          content: content,
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
