import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageApiResponse,
} from '@fylr/types';

import { Message as PrismaMessage } from '@prisma/client';

import { sanitizeMessage } from 'src/utils/text-sanitizer';

interface MessageWithThoughts extends MessageApiResponse {
  agentThoughts?: MessageApiResponse[];
}

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async getMessages(conversationId: string): Promise<MessageApiResponse[]> {
    try {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      return messages.map((msg) => sanitizeMessage(msg) as MessageApiResponse);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async getMessagesWithThoughts(
    conversationId: string,
  ): Promise<MessageWithThoughts[]> {
    try {
      const allMessages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      const displayMessages: MessageWithThoughts[] = [];
      const thoughtBuffer: MessageApiResponse[] = [];

      for (const msg of allMessages) {
        const sanitizedMsg = sanitizeMessage(msg) as MessageApiResponse;

        if (msg.role === 'user') {
          displayMessages.push(sanitizedMsg);
        } else if (msg.role === 'assistant') {
          if (msg.content) {
            displayMessages.push({
              ...sanitizedMsg,
              agentThoughts:
                thoughtBuffer.length > 0 ? [...thoughtBuffer] : undefined,
            });
            thoughtBuffer.length = 0;
          } else if (msg.reasoning || msg.toolCalls) {
            thoughtBuffer.push(sanitizedMsg);
          }
        }
      }

      return displayMessages;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async createMessage(
    body: CreateMessageDto,
    conversationId: string,
  ): Promise<PrismaMessage> {
    try {
      if (typeof body.metadata === 'string') {
        body.metadata = JSON.parse(body.metadata);
      }
    } catch (e) {
      throw new InternalServerErrorException('Invalid JSON format in metadata');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        ...body,
      },
    });

    return sanitizeMessage(message) as PrismaMessage;
  }

  async getMessage(id: string): Promise<MessageApiResponse | null> {
    try {
      const message = await this.prisma.message.findUnique({ where: { id } });
      return message ? (sanitizeMessage(message) as MessageApiResponse) : null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve message ${id}`,
      );
    }
  }

  async updateMessage(
    body: UpdateMessageDto,
    id: string,
  ): Promise<MessageApiResponse> {
    try {
      await this.getMessage(id);
      const message = await this.prisma.message.update({
        where: { id },
        data: body,
      });
      return sanitizeMessage(message) as MessageApiResponse;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update message ${id}`);
    }
  }

  async deleteMessage(id: string): Promise<PrismaMessage> {
    try {
      const message = await this.getMessage(id);
      if (!message) {
        throw new NotFoundException(`Message ${id} not found`);
      }

      if (message.role === 'user') {
        await this.prisma.message.deleteMany({
          where: { parentMessageId: id },
        });
      }

      return await this.prisma.message.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
