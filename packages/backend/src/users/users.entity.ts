import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { unique: true })
  password: string;

  @Column('text')
  name: string;

  /*
  Here are the fields needed for relation support
  @OneToMany(() => UserRecentConversation, urc => urc.user)
  recentConversations: UserRecentConversation[];

  @OneToMany(() => UserPinnedPodcast, upp => upp.user)
  pinnedPodcasts: UserPinnedPodcast[];

  @OneToMany(() => Pocket, pocket => pocket.user)
  pockets: Pocket[];
  */
}
