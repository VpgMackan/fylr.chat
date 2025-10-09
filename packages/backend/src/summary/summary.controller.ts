import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  Request,
} from '@nestjs/common';

import { SummaryService } from './summary.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSummaryDto } from '@fylr/types';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@UseGuards(AuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private summaryService: SummaryService) {}

  @Get('/')
  getSummariesByUserId(
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('searchTerm', new DefaultValuePipe('')) searchTerm: string,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.getSummariesByUserId(
      req.user.id,
      take,
      offset,
      searchTerm,
    );
  }

  @Post('/')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createSummary(
    @Body() createSummaryDto: CreateSummaryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.createSummary(req.user.id, createSummaryDto);
  }

  @Get('/:summaryId')
  getSummaryById(
    @Param('summaryId') summaryId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.getSummaryById(summaryId, req.user.id);
  }
}
