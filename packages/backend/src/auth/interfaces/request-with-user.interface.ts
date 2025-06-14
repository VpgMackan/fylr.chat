import { Request } from 'express';
import { UserPayload } from '@fylr/types';

export interface RequestWithUser extends Request {
  user: UserPayload;
}
