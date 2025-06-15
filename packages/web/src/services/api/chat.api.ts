import axios from "@/utils/axios";
import { ConversationApiResponse } from "@fylr/types";

export const getConversations = async (params: {
  take: number;
  offset: number;
}): Promise<ConversationApiResponse[]> => {
  const { data } = await axios.get<ConversationApiResponse[]>("chat/user/all", {
    params,
  });
  return data;
};

export const getConversationsByPocketId = async (
  id: string,
  params: {
    take: number;
    offset: number;
  }
): Promise<ConversationApiResponse[]> => {
  const { data } = await axios.get<ConversationApiResponse[]>(
    `chat/${id}/conversations`,
    { params }
  );
  return data;
};

export const getConversationWsToken = async (
  id: string
): Promise<{
  token: string;
}> => {
  const { data } = await axios.post<{
    token: string;
  }>(`/chat/conversation/${id}/ws-token`);
  return data;
};
