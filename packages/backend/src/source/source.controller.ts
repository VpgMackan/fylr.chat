import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  Res,
  NotFoundException,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';

import { SourceService } from './source.service';

import { AuthGuard } from 'src/auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('source')
export class SourceController {
  constructor(private sourceService: SourceService) {}

  @Post('create')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
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

    // Add to redis queue

    return {
      message: 'File uploaded successfully and queued for processing.',
      jobKey: jobKey,
      database: entry,
    };
  }
}
