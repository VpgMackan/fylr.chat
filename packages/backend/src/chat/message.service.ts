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

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
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
    // Store message in database
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

      const newMessage = this.messageRepository.create({
        conversationId: id,
        role: body.role,
        content: body.content,
        metadata: body.metadata,
      });
      await this.messageRepository.save(newMessage);
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
      return newMessage;
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
      // DELETE LATER WHEN ADDING LLM
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to store messages in database for conversation ${id}`,
      );
    }
    // Ask llm for rag question based on chat and context
    // Get the sources
    // Send all of the information to a LLM
    // Send resonse to user / Stream if possible
  }

  async getMessage(id: string) {
    try {
      return await this.messageRepository.findOne({
        where: { id: id },
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
      throw new InternalServerErrorException(
        `Failed to delete message ${id}`,
      );
    }
  }
}
