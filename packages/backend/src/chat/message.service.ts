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
    const hydePrompt = `Based on the chat history and the user's latest query, generate a hypothetical, concise paragraph that contains the most likely answer. This will be used to find relevant documents.
---
CHAT HISTORY:
${chatHistory}
---
USER QUERY:
"${userQuery}"
---
HYPOTHETICAL ANSWER:`;

    const hypotheticalAnswer = await this.aiService.llm.generate(hydePrompt);

    emitStatus('retrieval', 'Searching relevant sources...');
    const searchQueryEmbedding = await this.aiService.vector.search(
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
    const finalPrompt = `You are Fylr, a helpful AI assistant. Your goal is to answer the user's query based on the provided context and conversation history.

RULES:
- Use the provided context to answer the query.
- If the context does not contain the answer, state that you couldn't find the information in the provided documents. Do not use external knowledge.
- Keep your answers concise and to the point.
- When you use information from a source, cite it at the end of the sentence like this: [${relevantChunks[0]?.source.id}].
- You can cite multiple sources like this: [${relevantChunks[0]?.source.id}, ${relevantChunks[1]?.source.id}].

---
CONTEXT:
${context || 'No context was found.'}
---
CHAT HISTORY:
${chatHistory}
---
USER QUERY:
"${userQuery}"
---
ASSISTANT RESPONSE:`;

    const stream = this.aiService.llm.generateStream(finalPrompt);
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
