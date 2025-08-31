import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateMessageDto, UpdateMessageDto } from '@fylr/types';

import { LLMService } from 'src/ai/llm.service';
import { AiVectorService } from 'src/ai/vector.service';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
    private sourceService: SourceService,
  ) {}

  async getMessages(conversationId: string) {
    try {
      return await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${conversationId}`,
      );
    }
  }

  async createMessage(body: CreateMessageDto, conversationId: string) {
    try {
      if (typeof body.metadata === 'string') {
        body.metadata = JSON.parse(body.metadata);
      }
    } catch (e) {
      throw new InternalServerErrorException('Invalid JSON format in metadata');
    }

    return await this.prisma.message.create({
      data: {
        conversationId,
        ...body,
      },
    });
  }

  async generateAndStreamAiResponse(
    userMessage,
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
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { sources: true },
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found.`,
      );
    }

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const chatHistory = recentMessages
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    emitStatus('searchQuery', 'Formulating search query...');
    const hypotheticalAnswer = await this.llmService.generate({
      prompt_type: 'hyde',
      prompt_vars: { chatHistory, userQuery },
    });

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

    const sourceReferenceList = relevantChunks.map((chunk, index) => ({
      number: index + 1,
      name: chunk.source.name,
      chunkIndex: chunk.chunkIndex,
    }));

    const context = relevantChunks
      .map((chunk, index) => {
        return `Content from Source Chunk [${index + 1}] (${
          chunk.source.name
        }):\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    emitStatus('generation', 'Generating response...');

    const stream = this.llmService.generateStream({
      prompt_type: 'final_rag',
      prompt_version: 'v1',
      prompt_vars: { context, chatHistory, userQuery, sourceReferenceList },
    });
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
              id: c.id,
              sourceId: c.source.id,
              pocketId: c.source.pocketId,
              name: c.source.name,
              chunkIndex: c.chunkIndex,
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
    const assistantMessage = await this.prisma.message.findUnique({
      where: { id: assistantMessageId },
    });
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new NotFoundException('Assistant message to regenerate not found.');
    }

    const userMessage = await this.prisma.message.findFirst({
      where: {
        conversationId: assistantMessage.conversationId,
        createdAt: { lt: assistantMessage.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!userMessage || userMessage.role !== 'user') {
      throw new NotFoundException(
        'Could not find the original user prompt for regeneration.',
      );
    }

    await this.prisma.message.delete({
      where: {
        id: assistantMessageId,
      },
    });

    await this.generateAndStreamAiResponse(userMessage, server);
  }

  async getMessage(id: string) {
    try {
      return await this.prisma.message.findUnique({
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
      await this.getMessage(id);
      return await this.prisma.message.update({
        where: { id },
        data: body,
      });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update message ${id}`);
    }
  }

  async deleteMessage(id: string) {
    try {
      await this.getMessage(id);
      return await this.prisma.message.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete message ${id}`);
    }
  }
}
