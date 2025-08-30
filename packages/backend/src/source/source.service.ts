import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from 'src/common/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from 'src/utils/rabbitmq.service';
import * as fs from 'fs/promises';

@Injectable()
export class SourceService {
  private readonly s3Bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    const bucket = this.configService.get('S3_BUCKET_USER_FILE');
    if (!bucket) {
      throw new Error('S3_BUCKET_USER_FILE is not set in config');
    }
    this.s3Bucket = bucket;
  }

  async createSource(
    file: Express.Multer.File,
    pocketId: string,
    userId: string,
  ) {
    const pocket = await this.prisma.pocket.findFirst({
      where: { id: pocketId, userId },
    });

    if (!pocket) {
      await fs.unlink(file.path);
      throw new NotFoundException(
        `Pocket with ID "${pocketId}" not found or you do not have permission to access it.`,
      );
    }

    const jobKey = uuidv4();
    const s3Key = file.filename || file.originalname;

    try {
      const buffer = await fs.readFile(file.path);
      await this.s3Service.upload(this.s3Bucket, s3Key, buffer, {
        'Content-Type': file.mimetype,
      });
    } catch (error) {
      await fs.unlink(file.path);
      throw error;
    }

    await fs.unlink(file.path);

    const data: Prisma.SourceCreateInput = {
      pocket: { connect: { id: pocketId } },
      name: file.originalname,
      type: file.mimetype,
      url: s3Key,
      size: file.size,
      jobKey,
      status: 'QUEUED',
    };

    const entry = await this.prisma.source.create({ data });

    await this.rabbitMQService.sendToQueue('file-processing', {
      sourceId: entry.id,
      s3Key,
      mimeType: file.mimetype,
      jobKey,
    });

    return {
      message: 'File uploaded successfully and queued for processing.',
      jobKey,
      database: entry,
    };
  }

  async getSourcesByPocketId(pocketId: string, userId: string) {
    return await this.prisma.source.findMany({
      where: { pocketId, pocket: { userId } },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async getSourcesByConversationId(conversationId: string) {
    return await this.prisma.source.findMany({
      where: {
        conversations: {
          some: {
            id: conversationId,
          },
        },
      },
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

  async getSourceURL(sourceId: string, userId: string) {
    return this.prisma.source.findFirst({
      where: { id: sourceId, pocket: { userId } },
    });
  }

  async getFileStreamForUser(fileId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: {
        id: fileId,
        pocket: {
          userId: userId,
        },
      },
    });
    if (!source) return null;

    const stream = await this.s3Service.getObject(this.s3Bucket, source.url);
    return {
      stream,
      contentType: source.type,
      filename: source.name,
    };
  }
}
