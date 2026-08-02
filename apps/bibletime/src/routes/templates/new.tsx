import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { useTemplates } from "@/modules/templates"
import { useTranslation } from "@/modules/core/i18n"

export const Route = createFileRoute("/templates/new")({
  component: NewTemplateRoute,
})

/**
 * Thin: creates a new template immediately (so it exists in the library
 * right away, consistent with every other edit in this app being
 * auto-saved rather than staged) and hands off to `/templates/$templateId`,
 * the one real editor page, instead of duplicating that UI here.
 */
function NewTemplateRoute() {
  const navigate = useNavigate()
  const { create } = useTemplates()
  const { t } = useTranslation()
  const hasCreated = useRef(false)

  useEffect(() => {
    if (hasCreated.current) return
    hasCreated.current = true

    void create(t("templates.new")).then((saved) => {
      void navigate({
        to: "/templates/$templateId",
        params: { templateId: saved.id },
        search: { isNew: true },
        replace: true,
      })
    })
  }, [create, navigate, t])

  return <p className="p-6 text-sm text-muted-foreground">{t("templates.creating")}</p>
}
