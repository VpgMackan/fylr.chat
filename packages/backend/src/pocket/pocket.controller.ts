import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

import { PocketService } from './pocket.service';
import { UpdatePocketDto, CreatePocketDtoApiRequest } from '@fylr/types';

@UseGuards(AuthGuard)
@Controller('pocket')
export class PocketController {
  constructor(private pocketService: PocketService) {}

  @Get()
  getPockets(
    @Request() req: RequestWithUser,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('searchTerm', new DefaultValuePipe('')) searchTerm: string,
  ) {
    return this.pocketService.findMultipleByUserId(req.user.id, take, offset, searchTerm);
  }

  @Get('/:id')
  getPocketById(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.pocketService.findOneById(id, req.user.id);
  }

  @Patch('/:id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  updatePocketById(
    @Param('id') id: string,
    @Body() updateDto: UpdatePocketDto,
    @Request() req: RequestWithUser,
  ) {
    return this.pocketService.updatePocket(id, updateDto, req.user.id);
  }

  @Post('/')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createPocket(
    @Request() req: RequestWithUser,
    @Body() createPocketDto: CreatePocketDtoApiRequest,
  ) {
    return this.pocketService.createPocket({
      userId: req.user.id,
      ...createPocketDto,
    });
  }

  @Delete('/:id')
  deletePocketById(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.pocketService.deletePocket(id, req.user.id);
  }
}
