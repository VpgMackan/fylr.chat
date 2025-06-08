import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message } from './message.entity';
import { CreateMessageDto } from './create-message.dto';
import { UpdateMessageDto } from './update-message.dto';
import { AiService } from 'src/aiService/ai.service';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private aiService: AiService,
    private sourceService: SourceService,
  ) {}

  async getMessages(id: string) {
    try {
      return await this.messageRepository.find({
        where: {
          conversationId: id,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve messages for conversation ${id}`,
      );
    }
  }

  async createMessage(body: CreateMessageDto, id: string) {
    let newMessage;
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

      newMessage = this.messageRepository.create({
        conversationId: id,
        role: body.role,
        content: body.content,
        metadata: body.metadata,
      });
      await this.messageRepository.save(newMessage);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to store messages in database for conversation ${id}`,
      );
    }

    const searchQueryEmbedding = await this.aiService.vector.search(
      body.content,
      'jina-clip-v2',
      {},
    );

    const relevantChunks = await this.sourceService.findByVector(
      searchQueryEmbedding,
      'f3d4fff4-8099-431c-978c-38b0ac1fa2c3',
    );
    const context = relevantChunks
      .map((chunk) => chunk.content)
      .join('\n---\n');

    const prompt = `Based on the following context, answer the user's question.
                Context: ${context}
                Question: ${body.content}`;

    const aiResponseContent = await this.aiService.llm.generate(prompt);

    const assistantMessage = this.messageRepository.create({
      conversationId: id,
      role: 'assistant',
      content: aiResponseContent,
      metadata: {},
    });
    await this.messageRepository.save(assistantMessage);

    return [newMessage, assistantMessage];
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

  async processMessage(id: string) {
    this.messageRepository.findBy({ id });
  }
}
