import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

import { CreateConversationDto } from './create-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
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
        pocketId: pocketId,
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
}
