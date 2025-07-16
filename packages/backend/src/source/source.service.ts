import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { S3Service } from 'src/common/s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SourceService {
  constructor(
    private prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async createSourceDatabaseEntry(data) {
    return await this.prisma.source.create({ data });
  }

  async getSourcesByPocketId(pocketId: string) {
    return await this.prisma.source.findMany({
      where: { pocketId },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async findByVector(vector: number[], sourceIds: string[]) {
    if (sourceIds.length === 0) {
      return [];
    }

    const vectorSql = `[${vector.join(',')}]`;
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        v.id,
        v.file_id AS "fileId",
        v.content,
        s.id AS "source.id",
        s.pocket_id AS "source.pocketId",
        s.name AS "source.name"
      FROM "Vectors" v
      INNER JOIN "Sources" s ON s.id = v.file_id
      WHERE s.id IN (${Prisma.join(sourceIds)})
      ORDER BY v.embedding <-> ${vectorSql}::vector
      LIMIT 5
    `;

    return result.map((item) => ({
      id: item.id,
      fileId: item.fileId,
      content: item.content,
      source: {
        id: item['source.id'],
        pocketId: item['source.pocketId'],
        name: item['source.name'],
      },
    }));
  }

  async getSourceURL(sourceId: string) {
    return this.prisma.source.findUnique({
      where: { id: sourceId },
    });
  }

  async getFileStreamById(fileId: string) {
    // Find the source entry to get metadata
    const source = await this.prisma.source.findUnique({
      where: { id: fileId },
    });
    if (!source) return null;
    const bucket = this.configService.get<string>('S3_BUCKET_USER_FILE');
    if (!bucket) throw new Error('S3_BUCKET_USER_FILE is not set in config');
    const stream = await this.s3Service.getObject(bucket, fileId);
    return {
      stream,
      contentType: source.type,
      filename: source.name,
    };
  }
}
