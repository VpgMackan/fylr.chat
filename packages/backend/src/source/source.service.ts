import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from 'src/common/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from 'src/utils/rabbitmq.service';
import { PermissionsService } from 'src/auth/permissions.service';
import * as fs from 'fs/promises';

@Injectable()
export class SourceService {
  private readonly s3Bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly permissionsService: PermissionsService,
  ) {
    const bucket = this.configService.get('S3_BUCKET_USER_FILE');
    if (!bucket) {
      throw new Error('S3_BUCKET_USER_FILE is not set in config');
    }
    this.s3Bucket = bucket;
  }

  async createSource(
    file: Express.Multer.File,
    libraryId: string,
    userId: string,
  ) {
    const library = await this.prisma.library.findFirst({
      where: { id: libraryId, userId },
    });

    if (!library) {
      await fs.unlink(file.path);
      throw new NotFoundException(
        `Libary with ID "${libraryId}" not found or you do not have permission to access it.`,
      );
    }

    // Check if user can add source to library
    const canAddSource = await this.permissionsService.canAddSourceToLibrary(
      userId,
      libraryId,
    );

    if (!canAddSource) {
      await fs.unlink(file.path);
      throw new ForbiddenException(
        'You have reached the maximum number of sources for this library. Please upgrade to add more.',
      );
    }

    // Check daily upload limit
    await this.permissionsService.authorizeFeatureUsage(
      userId,
      'SOURCE_UPLOAD_DAILY',
    );

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
      library: { connect: { id: libraryId } },
      name: file.originalname,
      mimeType: file.mimetype,
      url: s3Key,
      size: file.size,
      jobKey,
      status: 'QUEUED',
    };

    const entry = await this.prisma.source.create({ data });

    await this.rabbitMQService.publishFileProcessingJob({
      sourceId: entry.id,
      s3Key,
      jobKey,
      embeddingModel: library.defaultEmbeddingModel,
    });

    return {
      message: 'File uploaded successfully and queued for processing.',
      jobKey,
      database: entry,
    };
  }

  async getSourcesByLibraryId(libraryId: string, userId: string) {
    return await this.prisma.source.findMany({
      where: { libraryId, library: { userId } },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async getSourcesByLibraryIds(libraryIds: string[], userId: string) {
    return await this.prisma.source.findMany({
      where: {
        libraryId: { in: libraryIds },
        library: { userId },
      },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async getSourcesByConversationId(conversationId: string, userId: string) {
    // Verify user has access to this conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        sources: {
          select: { id: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or not accessible');
    }

    // Get the IDs of sources currently associated with this conversation
    const conversationSourceIds = new Set(
      conversation.sources.map((s) => s.id),
    );

    // Get all sources from user's libraries
    const allSources = await this.prisma.source.findMany({
      where: {
        library: { userId },
      },
      orderBy: { uploadTime: 'desc' },
    });

    // Map sources with isActive flag
    return allSources.map((source) => ({
      ...source,
      isActive: conversationSourceIds.has(source.id),
    }));
  }

  async findByVector(vector: number[], sourceIds: string[], limit: number = 5) {
    if (sourceIds.length === 0) {
      return [];
    }

    const vectorSql = `[${vector.join(',')}]`;
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        v.id,
        v.file_id AS "fileId",
        v.content,
        v.chunk_index as "chunkIndex",
        s.id AS "source.id",
        s.library_id AS "source.libraryId",
        s.name AS "source.name"
      FROM "Vectors" v
      INNER JOIN "Sources" s ON s.id = v.file_id
      WHERE s.id IN (${Prisma.join(sourceIds)})
      ORDER BY v.embedding <-> ${vectorSql}::vector
      LIMIT ${limit}
    `;

    return result.map((item) => ({
      id: item.id,
      fileId: item.fileId,
      content: item.content,
      chunkIndex: item.chunkIndex,
      source: {
        id: item['source.id'],
        libraryId: item['source.libraryId'],
        name: item['source.name'],
      },
    }));
  }

  async getSourceURL(sourceId: string, userId: string) {
    return this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
    });
  }

  async getFileStreamForUser(fileId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: {
        id: fileId,
        library: {
          userId: userId,
        },
      },
    });
    if (!source) return null;

    const stream = await this.s3Service.getObject(this.s3Bucket, source.url);
    return {
      stream,
      contentType: source.mimeType,
      filename: source.name,
    };
  }

  async getVectorsBySourceId(sourceId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
    });
    if (!source) {
      throw new NotFoundException('Source not found or not accessible');
    }
    return await this.prisma.vector.findMany({
      where: { fileId: sourceId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  async requeueSource(sourceId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
      include: { library: true },
    });

    if (!source) {
      throw new NotFoundException('Source not found or not accessible');
    }

    const newJobKey = uuidv4();

    // Update the source with new job key and reset status
    const updatedSource = await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        jobKey: newJobKey,
        status: 'QUEUED',
      },
    });

    // Publish new processing job
    await this.rabbitMQService.publishFileProcessingJob({
      sourceId: source.id,
      s3Key: source.url,
      jobKey: newJobKey,
      embeddingModel: source.library.defaultEmbeddingModel,
    });

    return {
      message: 'Source re-queued for processing successfully.',
      jobKey: newJobKey,
      source: updatedSource,
    };
  }
}
