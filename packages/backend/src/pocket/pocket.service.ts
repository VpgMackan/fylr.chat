import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pocket } from './pocket.entity';

@Injectable()
export class PocketService {
  /**
   * Update pocket
   * Delete pocket
   */

  constructor(
    @InjectRepository(Pocket)
    private pocketRepository: Repository<Pocket>,
  ) {}

  /**
   * Get multiple pockets by a user id.
   * @param id The id for the user.
   * @param take Optional how many pockets to return. Default to 10.
   * @param offset Optional from where the netities should be taken. Default to 0.
   * @returns A promise resolving a array of pockets
   */
  async findMultipleByUserId(
    id: string,
    take: number = 10,
    offset: number = 0,
  ): Promise<Pocket[]> {
    const pocket = await this.pocketRepository.find({
      where: { userId: id },
      take,
      skip: offset,
    });
    if (!pocket)
      throw new NotFoundException(
        `Pockets owned by user ID "${id}" could not be located in database`,
      );

    return pocket;
  }

  /**
   * Get a single pocket based on a id.
   * @param id The id for the pocket to be retrived
   * @returns A promise resolving a pocket
   */
  async findOneById(id: string): Promise<Pocket> {
    const pocket = await this.pocketRepository.findOneBy({ id });
    if (!pocket)
      throw new NotFoundException(
        `Pocket with the ID "${id}" could not be located in database`,
      );

    return pocket;
  }

  /**
   * Creates a pocket and stores it in the database
   * @param userId The id for the user that created the pocket
   * @param icon An iconfiy class name
   * @param description A text describing the content in the pocket
   * @param tags A array of string with tags
   * @returns A promise resolving the newly created pocket
   */
  async createPocket(
    userId: string,
    icon: string,
    description: string,
    tags: string[],
  ): Promise<Pocket> {
    const newPocket = this.pocketRepository.create({
      userId,
      icon,
      description,
      tags,
    });
    await this.pocketRepository.save(newPocket);
    return newPocket;
  }
}
