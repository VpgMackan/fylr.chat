import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pocket } from './pocket.entity';

@Injectable()
export class PocketService {
  /*
   * CRUD Operations -> Create, read, update, delete
   * Fetch pocket by user id
   * Fetch pocket by pocket id
   * Create pocket
   * Update pocket
   * Delete pocket
   */

  constructor(
    @InjectRepository(Pocket)
    private pocketRepository: Repository<Pocket>,
  ) {}

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

  async findOneById(id: string): Promise<Pocket> {
    const pocket = await this.pocketRepository.findOneBy({ id });
    if (!pocket)
      throw new NotFoundException(
        `Pocket with the ID "${id}" could not be located in database`,
      );

    return pocket;
  }
}
