import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from 'src/users/users.entity';
import { Source } from 'src/source/source.entity';
import { Conversation } from 'src/chat/conversation.entity';

@Entity('Pockets')
export class Pocket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.pockets)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('character varying')
  icon: string;

  @Column('text')
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column('text', { array: true })
  tags: string[];

  @Column('character varying')
  title: string;

  @OneToMany(() => Source, (source) => source.pocket)
  source: Source[];

  @OneToMany(() => Conversation, (conversation) => conversation.pocket)
  conversation: Conversation[];
}
