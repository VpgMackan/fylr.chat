import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserPayload } from './interfaces/request-with-user.interface';

export interface SocketWithUser extends Socket {
  user: UserPayload;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: any): Promise<boolean> {
    const client: SocketWithUser = context
      .switchToWs()
      .getClient() as SocketWithUser;
    const token = client.handshake.auth.token;

    if (!token) {
      throw new WsException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<UserPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.user = payload; // Attach user to the socket instance
      return true;
    } catch (err) {
      throw new WsException('Invalid token');
    }
  }
}
