import { httpClient } from '../api';

export const notificationApi = {
  list: (page = 1, limit = 20) => httpClient.get(`/notifications?page=${page}&limit=${limit}`),
  markRead: (id) => httpClient.patch(`/notifications/${id}/read`),
  markAllRead: () => httpClient.patch('/notifications/read-all')
};

export default notificationApi;
