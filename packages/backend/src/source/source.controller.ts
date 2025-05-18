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

import { IsNotEmpty, IsString } from 'class-validator';
class CreateSourceDto {
  @IsNotEmpty()
  @IsString()
  pocketId: string;
}

const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown'];

@UseGuards(AuthGuard)
@Controller('source')
export class SourceController {
  constructor(
    private sourceService: SourceService,
    @InjectQueue('file-processing') private readonly fileProcessingQueue: Queue,
    private readonly aiService: AiService,
  ) {}

  @Post('create')
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

  @Post('search')
  async test(@Body() body) {
    const searchVector = await this.aiService.vector.search(
      body.query,
      'jina-clip-v2',
      {},
    );
    return await this.sourceService.findByVector(searchVector, body.pocketId);
  }
}
