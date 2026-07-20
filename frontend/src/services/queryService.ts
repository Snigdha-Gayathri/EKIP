import { apiClient } from './api';

export interface QueryRequestPayload {
  query: string;
  session_id?: string;
  filters?: Record<string, any>;
}

export const queryService = {
  submitQuery: async (payload: QueryRequestPayload) => {
    const response = await apiClient.post('/query', payload);
    return response.data;
  },
};
