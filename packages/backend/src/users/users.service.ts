import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './users.entity';

import { CreateUserDto, UpdateUserDto, UserApiResponse } from '@fylr/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    return user;
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  async createUser(userData: CreateUserDto): Promise<UserApiResponse> {
    const newUser = this.usersRepository.create(userData);
    await this.usersRepository.save(newUser);
    const { password: _password, ...result } = newUser;
    return result;
  }

  async updateUser(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<UserApiResponse> {
    const userToUpdate = await this.usersRepository.preload({
      id: id,
      ...updateData,
    });

    if (!userToUpdate)
      throw new NotFoundException(`User with ID "${id}" not found`);

    await this.usersRepository.save(userToUpdate);
    const { password: _password, ...result } = userToUpdate;
    return result;
  }
}
