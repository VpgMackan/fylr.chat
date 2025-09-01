import axios from '@/utils/axios';
import {
  PocketApiResponse,
  PocketWithRecentActivityApiResponse,
  UpdatePocketDto,
} from '@fylr/types';

export const getPockets = async (params: {
  take: number;
  offset: number;
  searchTerm: string;
}): Promise<PocketApiResponse[]> => {
  const { data } = await axios.get<PocketApiResponse[]>('pocket', { params });
  return data;
};

export const getPocketById = async (
  id: string,
): Promise<PocketWithRecentActivityApiResponse> => {
  const { data } = await axios.get<PocketWithRecentActivityApiResponse>(
    `pocket/${id}`,
  );
  return data;
};

export const updatePocket = async (
  id: string,
  dto: UpdatePocketDto,
): Promise<PocketApiResponse> => {
  const { data } = await axios.patch<PocketApiResponse>(`pocket/${id}`, dto);
  return data;
};
