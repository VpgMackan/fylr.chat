import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/create-user.dto';
import { compare, hash } from 'bcrypt';
import { NotFoundError } from 'rxjs';

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

    const payload = { id: user.id, name: user.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(data: CreateUserDto) {
    const password = await hash(data.password, 10);
    const user = await this.usersService.createUser({
      name: data.name,
      email: data.email,
      password,
    });
    return user;
  }
}
