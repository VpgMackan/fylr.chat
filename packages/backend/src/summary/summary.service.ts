import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSummaryDto } from '@fylr/types';
import { RabbitMQService } from 'src/utils/rabbitmq.service';

@Injectable()
export class SummaryService {
  constructor(
    private prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async getSummariesByPocketId(pocketId: string, take: number, offset: number) {
    return this.prisma.summary.findMany({
      where: { pocketId },
      take,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummaryById(id: string) {
    const summary = await this.prisma.summary.findUnique({
      where: { id },
      include: { episodes: true },
    });
    if (!summary)
      throw new NotFoundException(
        `Summary with the ID "${id}" could not be located in the database`,
      );

    return summary;
  }

  async createSummary(pocketId: string, createSummaryDto: CreateSummaryDto) {
    const { title, episodes } = createSummaryDto;

    const newSummary = await this.prisma.summary.create({
      data: {
        title,
        pocketId,
        length: 0,
        generated: 'PENDING',
        episodes: {
          create: episodes.map((episode) => ({
            title: episode.title,
            focus: episode.focus,
            content: 'Generating...',
          })),
        },
      },
    });

    await this.rabbitMQService.sendToQueue('summary-generator', newSummary.id);

    return newSummary;
  }
}
