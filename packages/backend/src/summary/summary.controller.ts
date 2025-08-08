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
import { RabbitMQService } from '../utils/rabbitmq.service';
import { SummaryService } from './summary.service';
import { AuthGuard } from 'src/auth/auth.guard';

const allowedMimeTypes = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/octet-stream',
];

@UseGuards(AuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(
    private summaryService: SummaryService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  // Create summary

  // Get summary
  @Get('/:summaryId')
  getSummaryById(@Param('summaryId') summaryId: string) {
    return this.summaryService.getSummaryById(summaryId);
  }
}
