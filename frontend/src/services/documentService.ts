import { apiClient } from './api';

export const documentService = {
  uploadDocument: async (file: File, category: string = 'engineering') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
