import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateUserDto, UpdateUserDto, UserApiResponse } from '@fylr/types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  async createUser(userData: CreateUserDto): Promise<UserApiResponse> {
    const newUser = await this.prisma.user.create({ data: userData });
    const { password: _password, ...result } = newUser;
    return result;
  }

  async updateUser(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<UserApiResponse> {
    await this.findOneById(id);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    const { password: _password, ...result } = updatedUser;
    return result;
  }
}
