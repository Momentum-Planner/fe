import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from '@/app/routeTree.gen'
import { queryClient } from '@/shared/api'
import { initAuth, restoreSession } from '@/entities/auth'

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
  return worker.start()
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  enableMocking()
    .then(() => restoreSession())
    .then(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
    })
}
