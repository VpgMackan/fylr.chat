import axios from '@/utils/axios';
import { CreatePodcastDto } from '@fylr/types';

export const getPodcasts = async (params: {
  take: number;
  offset: number;
  searchTerm?: string;
}) => {
  const { data } = await axios.get(`podcast`, { params });
  return data;
};

export const getPodcastById = async (podcastId: string) => {
  const { data } = await axios.get(`podcast/${podcastId}`);
  return data;
};

export const createPodcast = async (dto: CreatePodcastDto) => {
  const { data } = await axios.post(`podcast`, dto);
  return data;
};

export const updatePodcast = async (id: string, data: { title?: string }) => {
  const response = await axios.patch(`podcast/${id}`, data);
  return response.data;
};

export const deletePodcast = async (id: string): Promise<void> => {
  await axios.delete(`podcast/${id}`);
};
