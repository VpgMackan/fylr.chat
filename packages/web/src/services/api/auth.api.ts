import axios from '@/utils/axios';
import { UserApiResponse } from '@fylr/types';

export const getEventsWsToken = async (): Promise<{ token: string }> => {
  const { data } = await axios.get<{ token: string }>('/auth/websocket-token');
  return data;
};

export const getProfile = async (): Promise<UserApiResponse> => {
  const { data } = await axios.get<UserApiResponse>('/auth/profile');
  return data;
};

export const updateProfile = async (
  updateData: Partial<{ name: string; email: string; password: string }>,
): Promise<UserApiResponse> => {
  const { data } = await axios.patch<UserApiResponse>(
    '/auth/profile',
    updateData,
  );
  return data;
};

export const logout = async (): Promise<{ message: string }> => {
  const { data } = await axios.post<{ message: string }>('/auth/logout');
  return data;
};
