interface PlaceholderPickerProps {
  title: string
  description: string
}

/**
 * Sidebar content for tabs whose module has no real content yet (Songs,
 * Media) — still a real, non-empty sidebar rather than a blank or broken
 * one, so the console shell doesn't need to change shape once those
 * modules gain real data.
 */
export function PlaceholderPicker({ title, description }: PlaceholderPickerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
