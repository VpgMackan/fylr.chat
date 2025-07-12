import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';

import {
  CreateUserDto,
  UpdateUserDto,
  UserApiResponse,
  UserPayload,
} from '@fylr/types';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
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
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
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
    return this.jwtService.signAsync(chatPayload);
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
