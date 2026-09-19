import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { KakaoCallbackPage } from '@/pages/kakao-callback'

/** 카카오가 붙여 보내는 것. 사용자가 취소하면 code 대신 error 가 온다 */
const search = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/auth/kakao/callback')({
  validateSearch: search,
  component: KakaoCallbackPage,
})
