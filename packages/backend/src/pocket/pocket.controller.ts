import {
  Body,
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Request,
  UseGuards,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

import { PocketService } from './pocket.service';
import { CreatePocketDtoApiRequest } from './create-pocket-api-request.dto';

@Controller('pocket')
export class PocketController {
  constructor(private pocketService: PocketService) {}

  @UseGuards(AuthGuard)
  @Get()
  getPockets(@Request() req: RequestWithUser) {
    return this.pocketService.findMultipleByUserId(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  getPocketById(@Param('id') id: string) {
    return this.pocketService.findOneById(id);
  }

  @UseGuards(AuthGuard)
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
}
