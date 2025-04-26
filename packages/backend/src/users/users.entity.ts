import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Pocket } from 'src/pocket/pocket.entity';

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text')
  password: string;

  @Column('text')
  name: string;

  @OneToMany(() => Pocket, (pocket) => pocket.user)
  pockets: Pocket[];

  /*
  Here are the fields needed for relation support
  @OneToMany(() => UserRecentConversation, urc => urc.user)
  recentConversations: UserRecentConversation[];

  @OneToMany(() => UserPinnedPodcast, upp => upp.user)
  pinnedPodcasts: UserPinnedPodcast[];
  */
}
