import axios from '@/utils/axios';
import { CreatePodcastDto } from '@fylr/types';

export const getPodcastByPocketId = async (
  pocketId: string,
  params: { take: number; offset: number; searchTerm: string },
) => {
  const { data } = await axios.get(`podcast/pocket/${pocketId}`, { params });
  return data;
};

export const getPodcastById = async (podcastId: string) => {
  const { data } = await axios.get(`podcast/${podcastId}`);
  return data;
};

export const createPodcast = async (
  pocketId: string,
  dto: CreatePodcastDto,
) => {
  const { data } = await axios.post(`podcast/pocket/${pocketId}`, dto);
  return data;
};
