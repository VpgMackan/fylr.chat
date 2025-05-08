import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Source } from 'src/source/source.entity';

@Entity('Vectors')
export class Vector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'file_id' })
  fileId: string;

  @ManyToOne(() => Source, (source) => source.vectors)
  @JoinColumn({ name: 'file_id' })
  source: Source;

  @Column()
  embedding: string;

  @Column('text')
  content: string;
}
