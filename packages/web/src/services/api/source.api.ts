import axios from '@/utils/axios';
import { SourceApiResponse } from '@fylr/types';

export const getSourcesByLibraryId = async (
  libaryId: string,
): Promise<SourceApiResponse[]> => {
  const { data } = await axios.get<SourceApiResponse[]>(
    `source/library/${libaryId}`,
  );
  return data;
};

export const getSourceById = async (
  sourceId: string,
): Promise<SourceApiResponse> => {
  const { data } = await axios.get<SourceApiResponse>(
    `source/access/${sourceId}`,
  );
  return data;
};

export interface VectorChunk {
  id: string;
  fileId: string;
  content: string;
  chunkIndex: number;
}

export const getVectorsBySourceId = async (
  sourceId: string,
): Promise<VectorChunk[]> => {
  const { data } = await axios.get<VectorChunk[]>(`source/${sourceId}/vectors`);
  return data;
};

export const requeueSource = async (sourceId: string): Promise<any> => {
  const { data } = await axios.post(`source/${sourceId}/requeue`);
  return data;
};
