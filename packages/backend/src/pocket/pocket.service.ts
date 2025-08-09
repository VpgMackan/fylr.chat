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

  async findOneById(id: string, userId: string) {
    const pocket = await this.prisma.pocket.findFirst({
      where: { id, userId },
      include: { conversations: true, sources: true },
    });
    if (!pocket)
      throw new NotFoundException(
        `Pocket with the ID "${id}" could not be located in database`,
      );

    const { conversations, ...pocketData } = pocket;
    return { ...pocketData, recentActivity: conversations };
  }

  async createPocket(data: CreatePocketDto) {
    return await this.prisma.pocket.create({ data });
  }

  async updatePocket(id: string, updateData: UpdatePocketDto, userId: string) {
    return await this.prisma.pocket.update({
      where: { id, userId },
      data: updateData,
    });
  }

  async deletePocket(id: string, userId: string) {
    await this.findOneById(id, userId);
    return await this.prisma.pocket.delete({
      where: { id },
    });
  }
}
