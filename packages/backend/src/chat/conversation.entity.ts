import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Source } from 'src/source/source.entity';
import { Pocket } from 'src/pocket/pocket.entity';
import { Message } from './message.entity';

@Entity('Conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'pocket_id' })
  pocketId: string;

  @ManyToOne(() => Pocket, (pocket) => pocket.conversation)
  @JoinColumn({ name: 'pocket_id' })
  pocket: Pocket;

  @Column('jsonb')
  metadata: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column('character varying')
  title: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
