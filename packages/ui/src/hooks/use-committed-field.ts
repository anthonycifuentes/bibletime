"use client"

import * as React from "react"

/**
 * Backs a text input that holds what the user is typing and only commits it
 * on blur or Enter.
 *
 * Committing per keystroke fights the user mid-value — `#2A` is a valid
 * 3-digit hex, so a color field would yank to a color they never meant, and a
 * numeric field would see `4` on the way to `40`. `commit` is free to reject
 * an entry by doing nothing: the draft is dropped either way, so the input
 * falls back to the canonical value.
 */
export function useCommittedField(canonical: string, commit: (raw: string) => void) {
  const [draft, setDraft] = React.useState<string | null>(null)

  return {
    value: draft ?? canonical,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    onBlur: () => {
      if (draft !== null) commit(draft)
      setDraft(null)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") event.currentTarget.blur()
    },
  }
}
