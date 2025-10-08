import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreatePocketDto,
  PocketApiResponse,
  UpdatePocketDto,
} from '@fylr/types';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async findMultipleByUserId(
    id: string,
    take = 10,
    offset = 0,
    searchTerm = '',
  ): Promise<PocketApiResponse[]> {
    const libraries = await this.prisma.library.findMany({
      where: {
        userId: id,
        ...(searchTerm && {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } },
          ],
        }),
      },
      include: { sources: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip: offset,
    });

    if (!libraries || libraries.length === 0)
      throw new NotFoundException(
        `Libraries owned by user ID "${id}" could not be located in database`,
      );

    return libraries.map((p) => {
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
    const library = await this.prisma.library.findFirst({
      where: { id, userId },
      include: { sources: true },
    });
    if (!library)
      throw new NotFoundException(
        `library with the ID "${id}" could not be located in database`,
      );

    return { library };
  }

  async createLibrary(data: CreatePocketDto) {
    return await this.prisma.library.create({ data });
  }

  async updateLibrary(id: string, updateData: UpdatePocketDto, userId: string) {
    return await this.prisma.library.update({
      where: { id, userId },
      data: updateData,
    });
  }

  async deleteLibrary(id: string, userId: string) {
    await this.findOneById(id, userId);
    return await this.prisma.library.delete({
      where: { id },
    });
  }
}
