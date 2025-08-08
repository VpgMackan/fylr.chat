import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { SummaryService } from './summary.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSummaryDto } from '@fylr/types';

@UseGuards(AuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private summaryService: SummaryService) {}

  @Get('pocket/:pocketId')
  getSummariesByPocketId(
    @Param('pocketId') pocketId: string,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.summaryService.getSummariesByPocketId(pocketId, take, offset);
  }

  @Post('pocket/:pocketId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createSummary(
    @Param('pocketId') pocketId: string,
    @Body() createSummaryDto: CreateSummaryDto,
  ) {
    return this.summaryService.createSummary(pocketId, createSummaryDto);
  }

  @Get('/:summaryId')
  getSummaryById(@Param('summaryId') summaryId: string) {
    return this.summaryService.getSummaryById(summaryId);
  }
}
