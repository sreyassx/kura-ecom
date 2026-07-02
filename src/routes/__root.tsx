import { createRootRouteWithContext, Outlet, ScrollRestoration, HeadContent, Scripts } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { CartProvider } from '@/lib/cart'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import '@/global.css'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kura — curated drops, daily.' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const context = Route.useRouteContext()

  return (
    <RootDocument>
      <QueryClientProvider client={context.queryClient}>
        <AuthProvider>
          <CartProvider>
            <Outlet />
            <Toaster position="top-center" richColors />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased selection:bg-primary/10">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
