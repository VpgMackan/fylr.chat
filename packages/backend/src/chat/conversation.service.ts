import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
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

  async getConversations(pocketId: string, take = 10, offset = 0) {
    try {
      return await this.prisma.conversation.findMany({
        where: { pocketId },
        take,
        skip: offset,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve conversations for pocket ${pocketId}`,
      );
    }
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

  async createConversation(body: CreateConversationDto, pocketId: string) {
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

  async getConversation(conversationId: string) {
    try {
      return await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve conversation ${conversationId}`,
      );
    }
  }

  async updateConversation(body: UpdateConversationDto, id: string) {
    try {
      await this.getConversation(id);
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

  async deleteConversation(id: string) {
    try {
      await this.getConversations(id);
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
