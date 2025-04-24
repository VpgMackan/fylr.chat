import { Injectable } from '@nestjs/common';

import { User } from './users.entity';

@Injectable()
export class UsersService {
  async findOne(email: string): Promise<User | undefined> {
    return User.
  }
}
