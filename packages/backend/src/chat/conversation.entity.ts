import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { Pocket } from 'src/pocket/pocket.entity';
import { Message } from './message.entity';
import { Source } from 'src/source/source.entity';

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

  @ManyToMany(() => Source)
  @JoinTable({
    name: 'conversation_sources',
    joinColumn: { name: 'conversation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'source_id', referencedColumnName: 'id' },
  })
  sources: Source[];
}
