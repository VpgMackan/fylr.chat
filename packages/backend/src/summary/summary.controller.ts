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
  Patch,
  Delete,
} from '@nestjs/common';

import { SummaryService } from './summary.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSummaryDto, UpdateSummaryDto } from '@fylr/types';
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

  @Patch('/:summaryId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateSummary(
    @Param('summaryId') summaryId: string,
    @Body() updateSummaryDto: UpdateSummaryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.updateSummary(
      summaryId,
      req.user.id,
      updateSummaryDto.title,
    );
  }

  @Delete('/:summaryId')
  deleteSummary(
    @Param('summaryId') summaryId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.deleteSummary(summaryId, req.user.id);
  }
}
