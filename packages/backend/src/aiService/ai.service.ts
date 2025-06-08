import { Injectable } from '@nestjs/common';

import { AiVectorService } from './vector.service';
import { LLMService } from './llm.service';

@Injectable()
export class AiService {
  constructor(
    public readonly vector: AiVectorService,
    public readonly llm: LLMService,
  ) {}
}
