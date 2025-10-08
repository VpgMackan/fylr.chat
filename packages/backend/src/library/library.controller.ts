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

import { LibraryService } from './library.service';
import { UpdateLibraryDto, CreateLibraryDtoApiRequest } from '@fylr/types';

@UseGuards(AuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  @Get()
  getLibraries(
    @Request() req: RequestWithUser,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('searchTerm', new DefaultValuePipe('')) searchTerm: string,
  ) {
    return this.libraryService.findMultipleByUserId(
      req.user.id,
      take,
      offset,
      searchTerm,
    );
  }

  @Get('/:id')
  getLibarById(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.libraryService.findOneById(id, req.user.id);
  }

  @Patch('/:id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  updateLibarById(
    @Param('id') id: string,
    @Body() updateDto: UpdateLibraryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.libraryService.updateLibrary(id, updateDto, req.user.id);
  }

  @Post('/')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createLibrary(
    @Request() req: RequestWithUser,
    @Body() createLibraryDto: CreateLibraryDtoApiRequest,
  ) {
    return this.libraryService.createLibrary({
      userId: req.user.id,
      ...createLibraryDto,
    });
  }

  @Delete('/:id')
  deleteLibraryById(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.libraryService.deleteLibrary(id, req.user.id);
  }
}
