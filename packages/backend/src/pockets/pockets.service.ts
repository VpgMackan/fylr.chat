import { Injectable } from '@nestjs/common';
import { Pocket } from 'src/common/interfaces/pocket.interface';

@Injectable()
export class PocketsService {
  getPockets(): Pocket[] {
    return [
      {
        name: '🧠 Lorem',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        sources: 12,
        created: '2025/04/13',
      },
    ];
  }
}
