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
  size: number;
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
  source: SourceApiResponse[];
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
