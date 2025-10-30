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
  InternalServerErrorException,
  Delete,
  Param,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

import { RequestWithUser } from './interfaces/request-with-user.interface';

import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  UserPayload,
} from '@fylr/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setTokenCookies(
    res: ExpressResponse,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async signIn(@Body() loginDto: LoginDto, @Response() res: ExpressResponse) {
    const { user, tokens } = await this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );

    this.setTokenCookies(res, tokens);
    return res.json(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    const newTokens = await this.authService.refreshTokens(refreshToken);
    this.setTokenCookies(res, newTokens);
    return res.json({ message: 'Tokens refreshed successfully' });
  }

  @Get('csrf-token')
  getCsrfToken(@Request() req: ExpressRequest) {
    if (typeof req.csrfToken !== 'function') {
      throw new InternalServerErrorException(
        'CSRF token generation is not available.',
      );
    }
    return { csrfToken: req.csrfToken() };
  }

  @Post('signup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  signUp(@Body() signUpDto: CreateUserDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('logout')
  async logout(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    await this.authService.logout(refreshToken);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
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

  @UseGuards(AuthGuard)
  @Get('websocket-token')
  async getWebSocketToken(@Request() req: RequestWithUser) {
    return this.authService.generateWebSocketToken(req.user);
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  async getActiveSessions(@Request() req: RequestWithUser) {
    return this.authService.getActiveSessions(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param('id') sessionId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.authService.revokeSession(sessionId, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('sessions/revoke-all-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllOtherSessions(@Request() req: ExpressRequest) {
    const refreshToken = req.cookies['refresh_token'];
    const user = (req as any).user as UserPayload;
    if (!refreshToken || !user) {
      throw new BadRequestException('Missing user or token information');
    }
    await this.authService.revokeAllOtherSessions(user.id, refreshToken);
  }
}
