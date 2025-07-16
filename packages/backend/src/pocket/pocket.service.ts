import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreatePocketDto,
  PocketApiResponse,
  UpdatePocketDto,
} from '@fylr/types';

@Injectable()
export class PocketService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get multiple pockets by a user id.
   * @param id The id for the user.
   * @param take Optional how many pockets to return. Default to 10.
   * @param offset Optional from where the netities should be taken. Default to 0.
   * @returns A promise resolving a array of pockets
   */
  async findMultipleByUserId(
    id: string,
    take = 10,
    offset = 0,
  ): Promise<PocketApiResponse[]> {
    const pockets = await this.prisma.pocket.findMany({
      where: { userId: id },
      include: { sources: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip: offset,
    });

    if (!pockets || pockets.length === 0)
      throw new NotFoundException(
        `Pockets owned by user ID "${id}" could not be located in database`,
      );

    return pockets.map((p) => {
      const { createdAt, sources, ...rest } = p;
      return {
        ...rest,
        createdAt: createdAt.toISOString(),
        sources: sources.map((s) => ({
          ...s,
          size: s.size.toString(),
          uploadTime: s.uploadTime.toISOString(),
        })),
      };
    });
  }

  /**
   * Get a single pocket based on a id.
   * @param id The id for the pocket to be retrived
   * @returns A promise resolving a pocket
   */
  async findOneById(id: string) {
    const pocket = await this.prisma.pocket.findUnique({
      where: { id },
      include: { conversations: true, sources: true },
    });
    if (!pocket)
      throw new NotFoundException(
        `Pocket with the ID "${id}" could not be located in database`,
      );

    const { conversations, ...pocketData } = pocket;
    return { ...pocketData, recentActivity: conversations };
  }

  /**
   * Creates a pocket and stores it in the database
   * @param data An object containing the data for the new pocket
   * @returns A promise resolving the newly created pocket
   */
  async createPocket(data: CreatePocketDto) {
    return await this.prisma.pocket.create({ data });
  }

  /**
   * A function that updates a pocket
   * @param id The id for the pocket that should to be updated
   * @param updateData An object containing the fields to update (icon, description, tags)
   * @returns A promise resolving the newly updated pocket
   */
  async updatePocket(id: string, updateData: UpdatePocketDto) {
    return await this.prisma.pocket.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * A function that will remove a pocket from the database
   * @param id The id for the pocket that should be deleted
   * @returns A promise resolving a DeleteResult object indicating the outcome of the deletion.
   */
  async deletePocket(id: string) {
    await this.findOneById(id);
    return await this.prisma.pocket.delete({
      where: { id },
    });
  }
}
