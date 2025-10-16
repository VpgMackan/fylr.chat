import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSummaryDto } from '@fylr/types';
import { RabbitMQService } from 'src/utils/rabbitmq.service';

@Injectable()
export class SummaryService {
  constructor(
    private prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async getSummariesByUserId(
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const summaries = await this.prisma.summary.findMany({
      where: {
        userId,
        ...(searchTerm && {
          title: { contains: searchTerm, mode: 'insensitive' },
        }),
      },
      take,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return summaries;
  }

  async getSummaryById(id: string, userId: string) {
    const summary = await this.prisma.summary.findFirst({
      where: {
        id,
        userId,
      },
      include: { episodes: true },
    });
    if (!summary) {
      throw new NotFoundException(
        `Summary not found or you do not have permission to access it.`,
      );
    }
    return summary;
  }

  async createSummary(userId: string, createSummaryDto: CreateSummaryDto) {
    const {
      title,
      episodes,
      libraryIds = [],
      sourceIds = [],
    } = createSummaryDto;

    if (libraryIds.length === 0 && sourceIds.length === 0) {
      throw new BadRequestException(
        'Either libraryIds or sourceIds must be provided.',
      );
    }

    const allSourceIds = new Set<string>(sourceIds);

    if (libraryIds.length > 0) {
      const libraries = await this.prisma.library.findMany({
        where: { id: { in: libraryIds }, userId },
        include: { sources: { select: { id: true } } },
      });

      if (libraries.length !== libraryIds.length) {
        throw new ForbiddenException('You do not own all specified libraries.');
      }

      libraries.forEach((lib) =>
        lib.sources.forEach((src) => allSourceIds.add(src.id)),
      );
    }

    if (sourceIds.length > 0) {
      const sources = await this.prisma.source.findMany({
        where: { id: { in: sourceIds }, library: { userId } },
      });
      if (sources.length !== sourceIds.length) {
        throw new ForbiddenException('You do not own all specified sources.');
      }
    }

    const newSummary = await this.prisma.summary.create({
      data: {
        title,
        userId,
        length: 0,
        generated: 'PENDING',
        episodes: {
          create: episodes.map((episode) => ({
            title: episode.title,
            focus: episode.focus,
            content: 'Generating...',
          })),
        },
        sources: {
          connect: Array.from(allSourceIds).map((id) => ({ id })),
        },
      },
    });

    await this.rabbitMQService.sendToQueue('summary-generator', newSummary.id);

    return newSummary;
  }

  async updateSummary(id: string, userId: string, title?: string) {
    const summary = await this.prisma.summary.findFirst({
      where: { id, userId },
    });

    if (!summary) {
      throw new NotFoundException(
        `Summary not found or you do not have permission to access it.`,
      );
    }

    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = title;
    }

    return this.prisma.summary.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteSummary(id: string, userId: string) {
    const summary = await this.prisma.summary.findFirst({
      where: { id, userId },
    });

    if (!summary) {
      throw new NotFoundException(
        `Summary not found or you do not have permission to access it.`,
      );
    }

    return this.prisma.summary.delete({
      where: { id },
    });
  }
}
