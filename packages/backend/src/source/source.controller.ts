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
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SourceService } from './source.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AiService } from 'src/aiService/ai.service';

import { CreateSourceDto } from '@fylr/types';

const allowedMimeTypes = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/octet-stream',
];

@UseGuards(AuthGuard)
@Controller('source')
export class SourceController {
  constructor(
    private sourceService: SourceService,
    @InjectQueue('file-processing') private readonly fileProcessingQueue: Queue,
    private readonly aiService: AiService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}. Received: ${file.mimetype}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async createSource(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateSourceDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const jobKey = uuidv4();
    const data = {
      pocketId: body.pocketId,
      name: file.originalname,
      type: file.mimetype,
      url: file.path,
      size: file.size,
      jobKey,
      status: 'QUEUED',
    };

    const entry = await this.sourceService.createSourceDatabaseEntry(data);
    await this.fileProcessingQueue.add('process-file', entry);

    return {
      message: 'File uploaded successfully and queued for processing.',
      jobKey,
      database: entry,
    };
  }

  @Get('pocket/:pocketId')
  async getSourcesByPocketId(@Param('pocketId') pocketId: string) {
    return this.sourceService.getSourcesByPocketId(pocketId);
  }

  @Post('access/:sourceId')
  async getSourceURL(@Param('sourceId') sourceId: string) {
    return this.sourceService.getSourceURL(sourceId);
  }

  @Get('file/:fileId')
  async serveFile(@Param('fileId') fileId: string, @Res() res) {
    const fileStreamData = await this.sourceService.getFileStreamById(fileId);
    if (!fileStreamData) {
      throw new BadRequestException('File not found.');
    }
    res.setHeader('Content-Type', fileStreamData.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileStreamData.filename}"`,
    );
    fileStreamData.stream.pipe(res);
  }
}
