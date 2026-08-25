import { describe, expect, it } from "vitest"

import { normalizeSlideTemplate } from "@/modules/presentation/services/normalize-slide-template"
import { DEFAULT_SLIDE_TEMPLATE } from "@/modules/presentation/services/slide-template"

describe("slide template defaults", () => {
  it("starts new templates at 96px", () => {
    expect(DEFAULT_SLIDE_TEMPLATE.fontSize).toBe(96)
  })

  it("resolves a missing font size to 96px", () => {
    const { fontSize: _omitted, ...withoutSize } = DEFAULT_SLIDE_TEMPLATE
    expect(normalizeSlideTemplate(withoutSize).fontSize).toBe(96)
  })

  it("keeps a stored font size", () => {
    expect(normalizeSlideTemplate({ ...DEFAULT_SLIDE_TEMPLATE, fontSize: 48 }).fontSize).toBe(48)
  })
})
