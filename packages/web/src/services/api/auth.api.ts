import axios from '@/utils/axios';
import { UserApiResponse } from '@fylr/types';

export interface ActiveSession {
  id: string;
  createdAt: string;
  updatedAt: string;
}

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

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
  const { data } = await axios.get<ActiveSession[]>('/auth/sessions');
  return data;
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await axios.delete(`/auth/sessions/${sessionId}`);
};

export const revokeAllOtherSessions = async (): Promise<void> => {
  await axios.post('/auth/sessions/revoke-all-others');
};
