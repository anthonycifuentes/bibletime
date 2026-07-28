import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import type { ReactNode } from "react"

/**
 * App-wide React Query provider. The client is created once per component
 * instance (not a module-level singleton) so server-rendered requests don't
 * share cached state across users/sessions.
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
