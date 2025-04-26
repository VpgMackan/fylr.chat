import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './users.entity';

import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

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

  async createUser(userData: CreateUserDto): Promise<Omit<User, 'password'>> {
    const newUser = this.usersRepository.create(userData);
    await this.usersRepository.save(newUser);
    const { password, ...result } = newUser;
    return result;
  }

  async updateUser(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const userToUpdate = await this.usersRepository.preload({
      id: id,
      ...updateData,
    });

    if (!userToUpdate)
      throw new NotFoundException(`User with ID "${id}" not found`);

    await this.usersRepository.save(userToUpdate);
    const { password, ...result } = userToUpdate;
    return result;
  }
}
