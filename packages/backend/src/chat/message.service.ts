import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Server } from 'socket.io';

import { CreateMessageDto, UpdateMessageDto } from '@fylr/types';
import { createHydePrompt, createFinalRagPrompt } from '@fylr/prompts';

import { LLMService } from 'src/ai/llm.service';
import { AiVectorService } from 'src/ai/vector.service';
import { SourceService } from 'src/source/source.service';

import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
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
    const { conversationId, content: userQuery } = userMessage;

    const emitStatus = (stage: string, message: string) => {
      server.to(conversationId).emit('conversationAction', {
        action: 'statusUpdate',
        conversationId,
        data: { stage, message },
      });
    };

    emitStatus('history', 'Analyzing conversation history...');
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['sources'],
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found.`,
      );
    }

    const recentMessages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    const chatHistory = recentMessages
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    emitStatus('searchQuery', 'Formulating search query...');
    const hypotheticalAnswer = await this.llmService.generate(
      createHydePrompt(chatHistory, userQuery),
    );

    emitStatus('retrieval', 'Searching relevant sources...');
    const searchQueryEmbedding = await this.vectorService.search(
      hypotheticalAnswer,
      'jina-clip-v2',
      {},
    );

    const sourceIds = conversation.sources.map((s) => s.id);
    const relevantChunks =
      sourceIds.length > 0
        ? await this.sourceService.findByVector(searchQueryEmbedding, sourceIds)
        : [];

    const context = relevantChunks
      .map(
        (chunk) =>
          `<source id="${chunk.source.id}" pocketId="${chunk.source.pocketId}">\n${chunk.content}\n</source>`,
      )
      .join('\n---\n');

    emitStatus('generation', 'Generating response...');

    const stream = this.llmService.generateStream(
      createFinalRagPrompt(context, chatHistory, userQuery, relevantChunks),
    );
    let fullResponse = '';

    for await (const chunk of stream) {
      fullResponse += chunk;
      server.to(conversationId).emit('conversationAction', {
        action: 'messageChunk',
        conversationId: conversationId,
        data: { content: chunk },
      });
    }

    if (fullResponse) {
      const assistantMessage = await this.createMessage(
        {
          role: 'assistant',
          content: fullResponse,
          metadata: {
            relatedSources: relevantChunks.map((c) => ({
              id: c.source.id,
              pocketId: c.source.pocketId,
              name: c.source.name,
            })),
          },
        },
        conversationId,
      );
      server.to(conversationId).emit('conversationAction', {
        action: 'messageEnd',
        conversationId: conversationId,
        data: assistantMessage,
      });
    } else {
      // Handle no response
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
