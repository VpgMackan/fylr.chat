import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Server } from 'socket.io';

import { Message } from './message.entity';
import { CreateMessageDto, UpdateMessageDto } from '@fylr/types';
import { AiService } from 'src/aiService/ai.service';
import { SourceService } from 'src/source/source.service';
import { Conversation } from './conversation.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private aiService: AiService,
    private sourceService: SourceService,
  ) {}

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      return await this.messageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async createMessage(
    body: CreateMessageDto,
    conversationId: string,
  ): Promise<Message> {
    try {
      if (typeof body.metadata === 'string') {
        body.metadata = JSON.parse(body.metadata);
      }
    } catch (e) {
      throw new InternalServerErrorException('Invalid JSON format in metadata');
    }

    const newMessage = this.messageRepository.create({
      conversationId,
      ...body,
    });
    return await this.messageRepository.save(newMessage);
  }

  async generateAndStreamAiResponse(
    userMessage: Message,
    server: Server,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: userMessage.conversationId },
      relations: ['sources'],
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${userMessage.conversationId}" not found.`,
      );
    }

    const searchQueryEmbedding = await this.aiService.vector.search(
      userMessage.content,
      'jina-clip-v2',
      {},
    );

    const sourceIds = conversation.sources.map((s) => s.id);
    const relevantChunks = await this.sourceService.findByVector(
      searchQueryEmbedding,
      sourceIds,
    );
    const context = relevantChunks
      .map((chunk) => chunk.content)
      .join('\n---\n');

    const prompt = `Based on the following context, answer the user's question.\nContext: ${context}\nQuestion: ${userMessage.content}`;

    const stream = this.aiService.llm.generateStream(prompt);
    let fullResponse = '';

    for await (const chunk of stream) {
      fullResponse += chunk;
      server.to(userMessage.conversationId).emit('conversationAction', {
        action: 'messageChunk',
        conversationId: userMessage.conversationId,
        data: { content: chunk },
      });
    }

    if (fullResponse) {
      const assistantMessage = await this.createMessage(
        {
          role: 'assistant',
          content: fullResponse,
          metadata: {
            relatedSources: relevantChunks.map((c) => c.source.id),
          },
        },
        userMessage.conversationId,
      );
      server.to(userMessage.conversationId).emit('conversationAction', {
        action: 'messageEnd',
        conversationId: userMessage.conversationId,
        data: assistantMessage,
      });
    } else {
      server.to(userMessage.conversationId).emit('conversationAction', {
        action: 'streamError',
        conversationId: userMessage.conversationId,
        data: { message: 'Failed to get a response from the AI.' },
      });
    }
  }

  async regenerateAndStreamAiResponse(
    assistantMessageId: string,
    server: Server,
  ) {
    const assistantMessage = await this.messageRepository.findOneBy({
      id: assistantMessageId,
    });
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new NotFoundException('Assistant message to regenerate not found.');
    }

    const userMessage = await this.messageRepository.findOne({
      where: {
        conversationId: assistantMessage.conversationId,
        createdAt: LessThan(assistantMessage.createdAt),
      },
      order: { createdAt: 'DESC' },
    });

    if (!userMessage || userMessage.role !== 'user') {
      throw new NotFoundException(
        'Could not find the original user prompt for regeneration.',
      );
    }

    await this.messageRepository.delete(assistantMessageId);

    await this.generateAndStreamAiResponse(userMessage, server);
  }

  async getMessage(id: string) {
    try {
      return await this.messageRepository.findOne({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve message ${id}`,
      );
    }
  }

  async updateMessage(body: UpdateMessageDto, id: string) {
    try {
      const messageToUpdate = await this.messageRepository.preload({
        id,
        ...body,
      });

      if (!messageToUpdate)
        throw new NotFoundException(
          `Message with the ID "${id}" doesn't exist in database`,
        );

      await this.messageRepository.save(messageToUpdate);
      return messageToUpdate;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update message ${id}`);
    }
  }

  async deleteMessage(id: string) {
    try {
      const result = await this.messageRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(
          `Message with the ID "${id}" could not be deleted (unexpected error).`,
        );
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
