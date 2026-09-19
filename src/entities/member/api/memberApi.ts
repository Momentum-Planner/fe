import { api } from '@/shared/api'
import type { MyInfo, UpdateMyInfoRequest } from '../model/types'

const BASE = '/api/v1/members'

export const memberApi = {
  me: () => api.get<MyInfo>(`${BASE}/me`),
  updateMe: (req: UpdateMyInfoRequest) => api.patch<MyInfo>(`${BASE}/me`, req),
}
