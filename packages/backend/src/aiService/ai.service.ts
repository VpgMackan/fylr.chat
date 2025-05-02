import { Injectable } from '@nestjs/common';
import { AiVectorService } from './vector.service';

@Injectable()
export class AiService {
  constructor(public readonly vector: AiVectorService) {}
}
