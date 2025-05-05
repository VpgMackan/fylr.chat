import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { SourceService } from './source.service';

import { AuthGuard } from 'src/auth/auth.guard';
import { AiService } from 'src/aiService/ai.service';
import { ContentHandler } from './handler/content-handler.interface';

@UseGuards(AuthGuard)
@Controller('source')
export class SourceController {
  private allowedMimeTypes: string[];

  constructor(
    private sourceService: SourceService,
    @InjectQueue('file-processing') private readonly fileProcessingQueue: Queue,
    private readonly aiService: AiService,
    private readonly contentHandlers: ContentHandler[],
  ) {
    this.allowedMimeTypes = [
      ...new Set(
        contentHandlers.flatMap((handler) => handler.supportedMimeTypes),
      ),
    ];
  }

  @Post('create')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (
        _req: any,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (this.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}. Received: ${file.mimetype}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async createSource(@UploadedFile() file: Express.Multer.File, @Body() body) {
    if (!file) return { message: 'No file provided.' };
    const jobKey = uuidv4();

    const data = {
      pocketId: body.pocketId,
      name: file.originalname,
      type: file.mimetype,
      url: file.path,
      size: file.size,
      jobKey: jobKey,
      status: 'QUEUED',
    };

    const entry = await this.sourceService.createSourceDatabaseEntry(data);

    await this.fileProcessingQueue.add('process-file', entry);

    return {
      message: 'File uploaded successfully and queued for processing.',
      jobKey: jobKey,
      database: entry,
    };
  }

  @Get('/:query')
  test(@Param('query') query: string) {
    return this.aiService.vector.search(query, '', {});
  }
}
