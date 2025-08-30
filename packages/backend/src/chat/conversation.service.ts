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

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async generateWebSocketToken(
    user: UserPayload,
    conversationId: string,
  ): Promise<{ token: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
        pocket: {
          userId: user.id,
        },
      },
      include: {
        pocket: true,
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

  async getConversations(
    pocketId: string,
    userId: string,
    take = 10,
    offset = 0,
  ) {
    const pocket = await this.prisma.pocket.findFirst({
      where: { id: pocketId, userId },
    });
    if (!pocket) {
      throw new NotFoundException(`Pocket not found or access denied.`);
    }
    return this.prisma.conversation.findMany({
      where: { pocketId },
      take,
      skip: offset,
    });
  }

  async getConversationsByUserId(userId: string) {
    try {
      return await this.prisma.conversation.findMany({
        where: {
          pocket: {
            userId: userId,
          },
        },
        include: {
          pocket: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve conversations for user ${userId}: ${error.message}`,
      );
    }
  }

  async createConversation(
    body: CreateConversationDto,
    pocketId: string,
    userId: string,
  ) {
    const pocket = await this.prisma.pocket.findFirst({
      where: { id: pocketId, userId },
    });
    if (!pocket) {
      throw new NotFoundException(`Pocket not found or access denied.`);
    }

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

      return await this.prisma.conversation.create({
        data: {
          pocketId,
          title: body.title,
          metadata: body.metadata,
          sources: body.sourceIds
            ? {
                connect: body.sourceIds.map((id) => ({ id })),
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

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, pocket: { userId } },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation not found or access denied.`);
    }
    return conversation;
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
        pocket: { userId },
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
