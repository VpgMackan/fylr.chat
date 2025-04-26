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
  Delete,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

import { PocketService } from './pocket.service';
import { CreatePocketDtoApiRequest } from './create-pocket-api-request.dto';
import { UpdatePocketDto } from './update-pocket.dto';

@UseGuards(AuthGuard)
@Controller('pocket')
export class PocketController {
  constructor(private pocketService: PocketService) {}

  @Get()
  getPockets(@Request() req: RequestWithUser) {
    return this.pocketService.findMultipleByUserId(req.user.id);
  }

  @Get('/:id')
  getPocketById(@Param('id') id: string) {
    return this.pocketService.findOneById(id);
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
  ) {
    return this.pocketService.updatePocket(id, updateDto);
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
  deletePocketById(@Param('id') id: string) {
    return this.pocketService.deletePocket(id);
  }
}
