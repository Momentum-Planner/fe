import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/app/routeTree.gen'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return

  const { worker } = await import('../../mocks/browser')
  return worker.start()
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  enableMocking().then(() => {
    root.render(<RouterProvider router={router} />)
  })
}
