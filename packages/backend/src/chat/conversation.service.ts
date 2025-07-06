import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conversation } from './conversation.entity';

import {
  CreateConversationDto,
  UpdateConversationDto,
  UserPayload,
} from '@fylr/types';

import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private authService: AuthService,
  ) {}

  async generateWebSocketToken(
    user: UserPayload,
    conversationId: string,
  ): Promise<{ token: string }> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.pocket', 'pocket')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('pocket.userId = :userId', { userId: user.id })
      .getOne();

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
      return await this.conversationRepository.find({
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

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    try {
      return await this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoinAndSelect('conversation.pocket', 'pocket')
        .where('pocket.userId = :userId', { userId })
        .getMany();
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

      const newConversation = this.conversationRepository.create({
        pocketId,
        title: body.title,
        metadata: body.metadata,
        sources: body.sourceIds?.map((id) => ({ id })) || [],
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
