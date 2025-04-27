import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Pocket } from 'src/pocket/pocket.entity';

@Entity('Sources')
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'pocket_id' })
  pocketId: string;

  @ManyToOne(() => Pocket, (pocket) => pocket.source)
  @JoinColumn({ name: 'pocket_id' })
  pocket: Pocket;

  @Column('character varying')
  name: string;

  @Column('character varying')
  type: string;

  @Column('character varying')
  url: string;

  @Column('bigint')
  size: number;

  @CreateDateColumn({ name: 'upload_time' })
  uploadTime: Date;

  @Column('uuid', { name: 'job_key' })
  jobKey: string;

  @Column('text')
  status: string;
}
