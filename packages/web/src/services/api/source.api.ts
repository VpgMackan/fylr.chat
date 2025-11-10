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

export const deleteSource = async (sourceId: string): Promise<void> => {
  await axios.delete(`source/${sourceId}`);
};

export const updateSource = async (
  sourceId: string,
  data: { name?: string },
): Promise<SourceApiResponse> => {
  const { data: response } = await axios.patch<SourceApiResponse>(
    `source/${sourceId}`,
    data,
  );
  return response;
};

export const uploadSourceToLibrary = async (
  libraryId: string,
  file: File,
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('libraryId', libraryId);

  const { data } = await axios.post('/source', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

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
