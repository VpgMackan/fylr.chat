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
