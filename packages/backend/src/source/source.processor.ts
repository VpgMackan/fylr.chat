import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

import { EventsGateway } from '../events/events.gateway';
import { MinioService } from './minio/minio.service';

@Processor('file-processing')
export class SourceProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceProcessor.name);

  constructor(
    private readonly events: EventsGateway,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name !== 'process-file') {
      this.logger.warn(`Unknown job name: ${job.name}`);
      throw new Error(`Unknown job name: ${job.name}`);
    }
    this.processFile(job);
  }

  private async processFile(job) {
    const { id, name, type, url, jobKey } = job.data;
    const notify = (status: string, message: string) =>
      this.events.sendJobUpdate(jobKey, status, { message });

    this.logger.log(`Start processing job ${job.id} for ${name}`);
    try {
      notify('processing', 'Starting file analysis...');
      await fs.access(url);

      notify('processing', 'Uploading file to storage...');
      const buffer = await fs.readFile(url);
      await this.minio.upload(
        this.config.getOrThrow('MINIO_BUCKET_USER_FILE'),
        name,
        buffer,
        { 'Content-Type': type },
      );

      notify('processing', 'File uploaded. Processing content...');
      await this.processByType(type, buffer);

      notify('completed', 'File processing completed successfully.');
      this.logger.log(`Job ${job.id} completed for ${name}`);
      return { status: 'completed', fileId: id };
    } catch (err: any) {
      this.logger.error(`Job ${job.id} failed: ${err.message}`, err.stack);
      notify('failed', `Processing failed: ${err.message}`);
      throw err;
    } finally {
      await this.cleanupTemp(url);
    }
  }

  private async processByType(type: string, data: Buffer) {
    this.logger.log(`Processing content for type ${type}`);
    switch (type) {
      case 'application/pdf':
        this.porcessPdf();

      default:
        break;
    }
  }

  private async cleanupTemp(path: string) {
    try {
      await fs.unlink(path);
      this.logger.log(`Deleted temporary file: ${path}`);
    } catch (e: any) {
      this.logger.warn(`Could not delete temp file ${path}: ${e.message}`);
    }
  }

  private async porcessPdf() {
    // Extract content using github.com/VikParuchuri/marker
    // To get markdown

    this.porcessMd();
  }

  private async porcessMd() {
    // Convert the markdown to chunks
    // Convert chunks to vectors
    // Store vectors and chunks in database.
  }
}
