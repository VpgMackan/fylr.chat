import axios from '@/utils/axios';
import { SummaryApiResponse, CreateSummaryDto } from '@fylr/types';

export const getSummariesByPocketId = async (
  pocketId: string,
  params: { take: number; offset: number; searchTerm: string },
): Promise<SummaryApiResponse[]> => {
  const { data } = await axios.get<SummaryApiResponse[]>(
    `summary/pocket/${pocketId}`,
    { params },
  );
  return data;
};

export const createSummary = async (
  pocketId: string,
  dto: CreateSummaryDto,
): Promise<SummaryApiResponse> => {
  const { data } = await axios.post<SummaryApiResponse>(
    `summary/pocket/${pocketId}`,
    dto,
  );
  return data;
};
