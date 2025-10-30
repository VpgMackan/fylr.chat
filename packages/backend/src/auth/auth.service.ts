import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  CreateUserDto,
  UpdateUserDto,
  UserApiResponse,
  UserPayload,
} from '@fylr/types';

const BCRYPT_SALT_ROUNDS = 10;

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ user: UserPayload; tokens: Tokens }> {
    let user;
    try {
      user = await this.usersService.findOneByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw error;
    }

    const isMatch = await compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload: UserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    const tokens = await this.generateTokens(payload);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: payload, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<Tokens> {
    if (!refreshToken) {
      throw new ForbiddenException('Refresh token is missing');
    }

    const payload = await this.jwtService
      .verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
      .catch(() => {
        throw new ForbiddenException('Invalid or expired refresh token');
      });

    const hashedToken = await this.hashToken(refreshToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { hashedToken },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      throw new ForbiddenException('Refresh token has been revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const userPayload: UserPayload = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    };

    const newTokens = await this.generateTokens(userPayload);
    await this.storeRefreshToken(payload.id, newTokens.refreshToken);

    return newTokens;
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    if (!refreshToken) {
      return { message: 'No refresh token provided' };
    }
    try {
      const hashedToken = await this.hashToken(refreshToken);
      await this.prisma.refreshToken.update({
        where: { hashedToken },
        data: { revoked: true },
      });
    } catch (error) {}
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(payload: UserPayload): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRY', '15m'),
      }),
      this.jwtService.signAsync(
        { ...payload, jti: uuidv4() },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async hashToken(token: string): Promise<string> {
    return hash(token, BCRYPT_SALT_ROUNDS);
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const hashedToken = await this.hashToken(token);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        hashedToken,
      },
    });
  }

  async generateWebSocketToken(user: UserPayload): Promise<{ token: string }> {
    const payload: UserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '5m',
    });
    return { token };
  }

  async generateChatToken(
    payload: UserPayload,
    conversationId: string,
  ): Promise<string> {
    const chatPayload: Omit<UserPayload & { conversationId: string }, 'exp'> = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      conversationId,
    };
    return this.jwtService.signAsync(chatPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '5m',
    });
  }

  async signUp(data: CreateUserDto): Promise<UserApiResponse> {
    const hashedPassword = await hash(data.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      ...data,
      password: hashedPassword,
    });
    return user;
  }

  async updateProfile(
    userId: string,
    updateData: UpdateUserDto,
  ): Promise<UserApiResponse> {
    const dataToUpdate = { ...updateData };

    if (dataToUpdate.password) {
      dataToUpdate.password = await hash(
        dataToUpdate.password,
        BCRYPT_SALT_ROUNDS,
      );
    }

    const updatedUser = await this.usersService.updateUser(
      userId,
      dataToUpdate,
    );
    return updatedUser;
  }
}
