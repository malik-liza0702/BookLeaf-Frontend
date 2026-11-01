import { apiRequest } from './client';
import type { LoginRequest, LoginResponse, SingleResponse, User } from './types';

export const authApi = {
  login: (body: LoginRequest) =>
    apiRequest<SingleResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body,
      anonymous: true,
    }).then((res) => res.data),

  me: () => apiRequest<SingleResponse<User>>('/auth/me').then((res) => res.data),
};
