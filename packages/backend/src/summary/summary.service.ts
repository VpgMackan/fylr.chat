import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private prisma: PrismaService) {}

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
}
