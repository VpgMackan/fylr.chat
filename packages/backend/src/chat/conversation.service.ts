import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conversation } from './conversation.entity';

import { CreateConversationDto } from './create-conversation.dto';
import { UpdateConversationDto } from './update-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async getConversations(pocketId: string) {
    try {
      return await this.conversationRepository.findBy({
        pocketId,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve conversations for pocket ${pocketId}`,
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

      const newConversation = this.conversationRepository.create({
        pocketId,
        title: body.title,
        metadata: body.metadata,
      });
      await this.conversationRepository.save(newConversation);
      return newConversation;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create conversation: ${error.message}`,
      );
    }
  }

  async getConversation(conversationId: string) {
    try {
      return await this.conversationRepository.findOne({
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
      const conversationToUpdate = await this.conversationRepository.preload({
        id,
        ...body,
      });

      if (!conversationToUpdate)
        throw new NotFoundException(
          `Conversation with the ID "${id}" doesn't exist in database`,
        );

      await this.conversationRepository.save(conversationToUpdate);
      return conversationToUpdate;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update conversation ${id}`,
      );
    }
  }

  async deleteConversation(id: string) {
    try {
      const result = await this.conversationRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(
          `Conversation with the ID "${id}" could not be deleted (unexpected error).`,
        );
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete conversation ${id}`,
      );
    }
  }
}
