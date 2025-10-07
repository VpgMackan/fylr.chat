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

import { tools } from './tool';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly vectorService: AiVectorService,
    private sourceService: SourceService,
  ) {}

  private async executeTool(
    name: string,
    args: any,
    pocketId: string,
    conversationId: string,
    userId?: string,
  ): Promise<any> {
    console.log(`Executing tool: ${name} with args:`, args);
    switch (name) {
      case 'search_documents':
        const embedding = await this.vectorService.search(args.query);
        const sourceIds =
          args.source_ids ||
          (
            await this.sourceService.getSourcesByPocketId(
              pocketId,
              userId || '',
            )
          ).map((s) => s.id);
        return this.sourceService.findByVector(embedding, sourceIds);

      case 'list_sources_in_pocket':
        const conversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { pocket: true },
        });
        if (!conversation)
          throw new NotFoundException('No conversation found.');
        return this.sourceService.getSourcesByPocketId(
          pocketId,
          conversation.pocket.userId,
        );

      default:
        throw new Error(`Tool "${name}" not found.`);
    }
  }

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
    const searchQueryEmbedding =
      await this.vectorService.search(hypotheticalAnswer);

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
        conversationId,
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
        conversationId,
        data: assistantMessage,
      });
    } else {
      // Handle no response
    }
  }

  async generateAndStreamAiResponseWithTools(
    userMessage: any,
    server: Server,
  ): Promise<void> {
    const { conversationId } = userMessage;
    const MAX_ITERATIONS = 5;
    let currentIteration = 0;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { pocket: true },
    });
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found.`,
      );
    }
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const llmMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      tool_calls: m.toolCalls,
    }));

    while (currentIteration < MAX_ITERATIONS) {
      currentIteration++;

      const llmResponse = await this.llmService.generateWithTools(
        llmMessages,
        tools,
      );

      const responseMessage = llmResponse.choices[0].message;

      const thoughtMessage = await this.createMessage(
        {
          role: 'assistant',
          reasoning: responseMessage.content,
          toolCalls: responseMessage.tool_calls,
        },
        conversationId,
      );

      server.to(conversationId).emit('conversationAction', {
        action: 'agentThought',
        data: thoughtMessage,
      });

      if (
        !responseMessage.tool_calls ||
        responseMessage.tool_calls.length === 0
      ) {
        break;
      }

      const finalAnswerCall = responseMessage.tool_calls.find(
        (tc) => tc.function.name === 'provide_final_answer',
      );
      if (finalAnswerCall) {
        await this.synthesizeAndStreamFinalAnswer(
          llmMessages,
          conversationId,
          server,
        );
        return;
      }

      const toolResults = await Promise.all(
        responseMessage.tool_calls.map(async (toolCall) => {
          try {
            const result = await this.executeTool(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments),
              conversation.pocketId,
              conversationId,
              conversation.pocket.userId,
            );
            return {
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            };
          } catch (error) {
            return {
              tool_call_id: toolCall.id,
              content: `Error executing tool: ${error.message}`,
            };
          }
        }),
      );

      for (const result of toolResults) {
        await this.createMessage(
          {
            role: 'tool',
            toolCallId: result.tool_call_id,
            content: result.content,
          },
          conversationId,
        );
        llmMessages.push({ role: 'tool', ...result, tool_calls: null });
      }
    }
    await this.synthesizeAndStreamFinalAnswer(
      llmMessages,
      conversationId,
      server,
      "I seem to have finished my thought process without a final conclusion. Here's a summary of my findings.",
    );
  }

  private async synthesizeAndStreamFinalAnswer(
    messages: any[],
    conversationId: string,
    server: Server,
    overrideQuery?: string,
  ) {
    const synthesisPrompt = `
        Based on the entire conversation history, including all thoughts and tool results, provide a final, comprehensive answer to the initial user query.
        The user's final query was: "${messages.find((m) => m.role === 'user').content}".
        Synthesize the information you've gathered. Cite sources if applicable using markdown format.
        ${overrideQuery || ''}
      `;

    messages.push({ role: 'user', content: synthesisPrompt });

    const stream = this.llmService.generateStream({
      prompt_type: 'synthesis',
      prompt_vars: { messages },
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      server.to(conversationId).emit('conversationAction', {
        action: 'messageChunk',
        conversationId,
        data: { content: chunk },
      });
    }

    const finalAssistantMessage = await this.createMessage(
      { role: 'assistant', content: fullResponse },
      conversationId,
    );
    server.to(conversationId).emit('conversationAction', {
      action: 'messageEnd',
      conversationId,
      data: finalAssistantMessage,
    });
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
