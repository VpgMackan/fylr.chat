import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { User } from 'src/users/users.entity';

import { UserPayload } from './interfaces/request-with-user.interface';
import { CreateUserDto, UpdateUserDto } from '@fylr/types';

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

  async signUp(data: CreateUserDto): Promise<Omit<User, 'password'>> {
    const saltRounds = 10;
    const hashedPassword = await hash(data.password, saltRounds);
    const user = await this.usersService.createUser({
      ...data,
      password: hashedPassword,
    });
    return user;
  }

  async updateProfile(
    userId: string,
    updateData: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const dataToUpdate = { ...updateData };

    if (dataToUpdate.password) {
      const saltRounds = 10;
      dataToUpdate.password = await hash(dataToUpdate.password, saltRounds);
    }

    const updatedUser = await this.usersService.updateUser(
      userId,
      dataToUpdate,
    );
    return updatedUser;
  }
}
