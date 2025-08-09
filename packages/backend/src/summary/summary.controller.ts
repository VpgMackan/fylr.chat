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

  @Get('pocket/:pocketId')
  getSummariesByPocketId(
    @Param('pocketId') pocketId: string,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.getSummariesByPocketId(
      pocketId,
      req.user.id,
      take,
      offset,
    );
  }

  @Post('pocket/:pocketId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createSummary(
    @Param('pocketId') pocketId: string,
    @Body() createSummaryDto: CreateSummaryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.createSummary(
      pocketId,
      req.user.id,
      createSummaryDto,
    );
  }

  @Get('/:summaryId')
  getSummaryById(
    @Param('summaryId') summaryId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.summaryService.getSummaryById(summaryId, req.user.id);
  }
}
