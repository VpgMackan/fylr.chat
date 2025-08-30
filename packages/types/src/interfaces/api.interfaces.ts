export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
}
export interface SourceApiResponse {
  id: string;
  pocketId: string;
  name: string;
  type: string;
  url: string;
  size: string;
  uploadTime: string;
  status: string;
}

export interface ConversationApiResponse {
  id: string;
  pocketId: string;
  metadata: object;
  createdAt: string;
  title: string;
}

export interface PocketApiResponse {
  id: string;
  userId: string;
  icon: string;
  description: string;
  createdAt: string;
  tags: string[];
  title: string;
  sources: SourceApiResponse[];
}

export interface PocketWithRecentActivityApiResponse extends PocketApiResponse {
  recentActivity: ConversationApiResponse[];
}

export interface MessageApiResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata: object;
}

export interface SourceApiResponseWithIsActive extends SourceApiResponse {
  isActive: boolean;
}

export interface MessageAndSourceApiResponse {
  messages: MessageApiResponse[];
  sources: SourceApiResponseWithIsActive[];
}

export interface SummaryEpisodeApiResponse {
  id: string;
  title: string;
  focus?: string;
  content: string;
  createdAt: string;
}

export interface SummaryApiResponse {
  id: string;
  title: string;
  createdAt: string;
  generated: string | null;
}
