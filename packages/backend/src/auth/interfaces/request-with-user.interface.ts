import { Request } from 'express';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
