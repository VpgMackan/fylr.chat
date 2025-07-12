import axios from '@/utils/axios';

export const getEventsWsToken = async (): Promise<{ token: string }> => {
  const { data } = await axios.get<{ token: string }>('/auth/websocket-token');
  return data;
};
