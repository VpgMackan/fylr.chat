import axios from '@/utils/axios';
import { ConversationApiResponse, CreateConversationDto } from '@fylr/types';

export const getConversations = async (params: {
  take: number;
  offset: number;
}): Promise<ConversationApiResponse[]> => {
  const { data } = await axios.get<ConversationApiResponse[]>(
    'chat/conversations',
    {
      params,
    },
  );
  return data;
};

export const createConversation = async (
  data: CreateConversationDto,
): Promise<ConversationApiResponse> => {
  const response = await axios.post(`chat/conversation`, data);
  return response.data;
};

export const initiateConversation = async (
  content: string,
  sourceIds?: string[],
  libraryIds?: string[],
  agenticMode?: boolean,
  webSearchEnabled?: boolean,
): Promise<ConversationApiResponse> => {
  const { data } = await axios.post<ConversationApiResponse>(
    'chat/conversation/initiate',
    { content, sourceIds, libraryIds, agenticMode, webSearchEnabled },
  );
  return data;
};

export const getConversationWsToken = async (
  id: string,
): Promise<{
  token: string;
}> => {
  const { data } = await axios.post<{
    token: string;
  }>(`chat/conversation/${id}/ws-token`);
  return data;
};

export const updateConversation = async (
  id: string,
  data: { title?: string; metadata?: object },
): Promise<ConversationApiResponse> => {
  const response = await axios.patch(`chat/conversation/${id}`, data);
  return response.data;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await axios.delete(`chat/conversation/${id}`);
};
