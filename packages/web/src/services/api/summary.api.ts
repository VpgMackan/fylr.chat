import axios from '@/utils/axios';
import { SummaryApiResponse, CreateSummaryDto } from '@fylr/types';

export const getSummaries = async (params: {
  take: number;
  offset: number;
  searchTerm?: string;
}): Promise<SummaryApiResponse[]> => {
  const { data } = await axios.get<SummaryApiResponse[]>(`summary`, { params });
  return data;
};

export const getSummaryById = async (
  id: string,
): Promise<SummaryApiResponse> => {
  const { data } = await axios.get<SummaryApiResponse>(`summary/${id}`);
  return data;
};

export const createSummary = async (
  dto: CreateSummaryDto,
): Promise<SummaryApiResponse> => {
  const { data } = await axios.post<SummaryApiResponse>(`summary`, dto);
  return data;
};

export const updateSummary = async (
  id: string,
  data: { title?: string },
): Promise<SummaryApiResponse> => {
  const response = await axios.patch(`summary/${id}`, data);
  return response.data;
};

export const deleteSummary = async (id: string): Promise<void> => {
  await axios.delete(`summary/${id}`);
};
