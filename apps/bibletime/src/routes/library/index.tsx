import { createFileRoute } from "@tanstack/react-router"

import { ConsoleView } from "@/modules/library"

export const Route = createFileRoute("/library/")({
  component: ConsoleView,
})
