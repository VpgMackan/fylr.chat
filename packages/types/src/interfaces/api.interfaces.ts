export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
}
export interface SourceApiResponse {
  id: string;
  libraryId: string;
  name: string;
  type: string;
  url: string;
  size: string;
  uploadTime: string;
  status: string;
  jobKey?: string;
}

export interface ConversationApiResponse {
  id: string;
  userId: string;
  metadata: object;
  createdAt: string;
  title: string;
}

export interface LibraryApiResponse {
  id: string;
  userId: string;
  icon: string;
  description: string;
  createdAt: string;
  tags: string[];
  title: string;
  sources: SourceApiResponse[];
}

export interface MessageApiResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string | null; // Can be null for thoughts that only contain reasoning/tool_calls
  reasoning: string | null;
  toolCalls: any | null; // Can be more specific if you define a ToolCall type
  toolCallId: string | null;
  createdAt: string;
  metadata: object;
}

export interface SourceApiResponseWithIsActive extends SourceApiResponse {
  isActive: boolean;
}

export interface MessageAndSourceApiResponse {
  messages: MessageApiResponse[];
  sources: SourceApiResponseWithIsActive[];
  name: string;
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
  episodes: SummaryEpisodeApiResponse[];
}

export interface PodcastEpisodeApiResponse {
  id: string;
  title: string;
  focus?: string;
  content: string;
  createdAt: string;
  audioKey?: string;
}

export interface PodcastApiResponse {
  id: string;
  title: string;
  createdAt: string;
  generated: string | null;
  episodes: PodcastEpisodeApiResponse[];
}
