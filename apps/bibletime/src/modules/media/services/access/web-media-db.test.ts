import { describe, expect, it } from "vitest"

import { CACHE_BUDGET_BYTES, selectEvictions } from "./web-media-db"

const entry = (key: string, bytes: number, lastUsedAt: number) => ({ key, bytes, lastUsedAt })

describe("selectEvictions", () => {
  it("frees nothing when the cache already fits", () => {
    const entries = [entry("a", 100, 1), entry("b", 100, 2)]
    expect(selectEvictions(entries, 0)).toEqual([])
    expect(selectEvictions(entries, -500)).toEqual([])
  })

  it("evicts least-recently-used first", () => {
    const entries = [entry("newest", 100, 300), entry("oldest", 100, 100), entry("middle", 100, 200)]
    expect(selectEvictions(entries, 100)).toEqual(["oldest"])
  })

  it("keeps evicting, oldest first, until enough is freed", () => {
    const entries = [entry("newest", 100, 400), entry("oldest", 100, 100), entry("second", 100, 200)]
    expect(selectEvictions(entries, 200)).toEqual(["oldest", "second"])
  })

  it("stops as soon as the target is met rather than clearing the cache", () => {
    const entries = Array.from({ length: 10 }, (_, index) => entry(`e${index}`, 50, index))
    // 120 bytes needed: two 50s aren't enough, three are.
    expect(selectEvictions(entries, 120)).toEqual(["e0", "e1", "e2"])
  })

  it("counts a single large entry as satisfying the whole request", () => {
    const entries = [entry("big", 5000, 1), entry("small", 10, 2)]
    expect(selectEvictions(entries, 1000)).toEqual(["big"])
  })

  it("returns everything when the request exceeds what is stored", () => {
    const entries = [entry("a", 10, 1), entry("b", 10, 2)]
    expect(selectEvictions(entries, 10_000)).toEqual(["a", "b"])
  })

  it("handles an empty cache without failing", () => {
    expect(selectEvictions([], 1000)).toEqual([])
  })

  it("does not mutate the array it is given", () => {
    const entries = [entry("newest", 100, 300), entry("oldest", 100, 100)]
    const snapshot = entries.map((item) => item.key)
    selectEvictions(entries, 100)
    expect(entries.map((item) => item.key)).toEqual(snapshot)
  })

  it("keeps a budget large enough to be worth having", () => {
    // Guards the constant against an accidental edit: a deck of rendered
    // pages runs to tens of megabytes, so anything under 64 MB would evict
    // a document mid-service.
    expect(CACHE_BUDGET_BYTES).toBeGreaterThanOrEqual(64 * 1024 * 1024)
  })
})
