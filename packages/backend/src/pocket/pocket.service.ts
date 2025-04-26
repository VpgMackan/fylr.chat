import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';

import { Pocket } from './pocket.entity';
import { UpdateUserDto } from 'src/users/update-user.dto';
import { CreatePocketDto } from './create-pocket.dto';

@Injectable()
export class PocketService {
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
   * @param data An object containing the data for the new pocket
   * @returns A promise resolving the newly created pocket
   */
  async createPocket(data: CreatePocketDto): Promise<Pocket> {
    const newPocket = this.pocketRepository.create(data);
    await this.pocketRepository.save(newPocket);
    return newPocket;
  }

  /**
   * A function that updates a pocket
   * @param id The id for the pocket that should to be updated
   * @param updateData An object containing the fields to update (icon, description, tags)
   * @returns A promise resolving the newly updated pocket
   */
  async updatePocket(id: string, updateData: UpdateUserDto): Promise<Pocket> {
    const pocketToUpdate = await this.pocketRepository.preload({
      id,
      ...updateData,
    });

    if (!pocketToUpdate)
      throw new NotFoundException(
        `Pocket with the ID "${id}" doesn't exist in database`,
      );

    await this.pocketRepository.save(pocketToUpdate);
    return pocketToUpdate;
  }

  /**
   * A function that will remove a pocket from the database
   * @param id The id for the pocket that should be deleted
   * @returns A promise resolving a DeleteResult object indicating the outcome of the deletion.
   */
  async deletePocket(id: string): Promise<DeleteResult> {
    await this.findOneById(id);
    const result = await this.pocketRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Pocket with the ID "${id}" could not be deleted (unexpected error).`,
      );
    }

    return result;
  }
}
