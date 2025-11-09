import axios from '@/utils/axios';

export interface Subscription {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'INACTIVE';
  expiresAt: string | null;
  remainingDurationOnPause: number | null;
  pausedAt: string | null;
  lastResumedAt: string | null;
}

export const redeemGiftCard = async (code: string): Promise<Subscription> => {
  const { data } = await axios.post<Subscription>('/gift-card/redeem', {
    code,
  });
  return data;
};

export const getSubscription = async (): Promise<Subscription> => {
  const { data } = await axios.get<Subscription>('/subscription');
  return data;
};

export const pauseSubscription = async (): Promise<Subscription> => {
  const { data } = await axios.post<Subscription>('/subscription/pause');
  return data;
};

export const resumeSubscription = async (): Promise<Subscription> => {
  const { data } = await axios.post<Subscription>('/subscription/resume');
  return data;
};
