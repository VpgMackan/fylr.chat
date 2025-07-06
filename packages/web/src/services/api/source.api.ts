import axios from "@/utils/axios";
import { SourceApiResponse } from "@fylr/types";

export const getSourcesByPocketId = async (
  pocketId: string
): Promise<SourceApiResponse[]> => {
  const { data } = await axios.get<SourceApiResponse[]>(
    `source/pocket/${pocketId}`
  );
  return data;
};
