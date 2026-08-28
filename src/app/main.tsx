import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from '@/app/routeTree.gen'
import { queryClient } from '@/shared/api'
import { authApi, authKeys, initAuth, restoreSession } from '@/entities/auth'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

// 401 refresh 핸들러 주입은 렌더 전에 동기로 등록한다.
initAuth()

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return

  const { worker } = await import('../../mocks/browser')
  // 서비스워커 등록이 막힌 환경(일부 임베디드 브라우저)에서 앱 전체가 백지가 되지
  // 않게 삼킨다. 목이 안 붙을 뿐 화면은 뜬다.
  return worker
    .start({
      // 핸들러가 없는 요청은 조용히 실제 네트워크로 보낸다.
      // 기본값('warn')이면 목에 없는 API 마다 콘솔 경고가 쌓인다.
      onUnhandledRequest: 'bypass',
    })
    .catch((e: unknown) => {
      console.warn('[msw] 목 서버 비활성 — 실제 네트워크로 나갑니다', e)
    })
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  enableMocking()
    .then(() => restoreSession())
    .then(() => {
      // 계정을 캐시에 채워 둔다 — `/` 로더가 이 값으로 첫 화면을 가른다(Q7-2).
      // ⚠️ **await 하지 않는다.** 인증 엔드포인트가 없거나 느린 환경에서
      //    부트스트랩이 그대로 멈춰 앱이 안 뜬다. 못 채우면 로더가 알아서
      //    짧게 기다렸다가 비로그인으로 넘어간다.
      void queryClient.prefetchQuery({
        queryKey: authKeys.account(),
        queryFn: () => authApi.account(),
      })

      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
    })
}
