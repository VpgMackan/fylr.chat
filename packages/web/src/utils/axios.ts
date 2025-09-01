import axios, { isAxiosError } from 'axios';
import { toast } from 'react-hot-toast';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An unexpected error occurred.';
    if (isAxiosError(error)) {
      const responseData = error.response?.data;
      if (responseData && typeof responseData.message === 'string') {
        errorMessage = responseData.message;
      } else if (Array.isArray(responseData?.message)) {
        errorMessage = responseData.message[0];
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    toast.error(errorMessage);
    return Promise.reject(error);
  },
);

export default instance;
