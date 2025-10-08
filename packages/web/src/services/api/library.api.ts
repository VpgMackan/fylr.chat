import axios from '@/utils/axios';
import { LibraryApiResponse, UpdateLibraryDto } from '@fylr/types';

export interface SimpleLibrary {
  id: string;
  title: string;
}

export const listLibraries = async (): Promise<SimpleLibrary[]> => {
  const { data } = await axios.get<SimpleLibrary[]>('library/list');
  return data;
};

export const getLibraries = async (params: {
  take: number;
  offset: number;
  searchTerm: string;
}): Promise<LibraryApiResponse[]> => {
  const { data } = await axios.get<LibraryApiResponse[]>('library', { params });
  return data;
};

export const getLibraryById = async (id: string) => {
  const { data } = await axios.get(`libary/${id}`);
  return data;
};

export const updateLibrary = async (
  id: string,
  dto: UpdateLibraryDto,
): Promise<LibraryApiResponse> => {
  const { data } = await axios.patch<LibraryApiResponse>(`library/${id}`, dto);
  return data;
};
