import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Request,
  Response,
  UseGuards,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

import { RequestWithUser } from './interfaces/request-with-user.interface';

import { CreateUserDto, UpdateUserDto, LoginDto } from '@fylr/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async signIn(@Body() loginDto: LoginDto, @Response() res: ExpressResponse) {
    const result = await this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1 * 60 * 60 * 100,
    });

    return res.json(result);
  }

  @Post('signup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  signUp(@Body() signUpDto: CreateUserDto) {
    return this.authService.signUp(signUpDto);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Response() res: ExpressResponse) {
    res.clearCookie('access_token');
    return res.json({ message: 'Logged out successfully' });
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  )
  updateProfile(
    @Request() req: RequestWithUser,
    @Body() updateDto: UpdateUserDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token payload.');
    }
    return this.authService.updateProfile(userId, updateDto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }
}
