# Bible data

How Scripture text gets into BibleTime, where it comes from, and what its licensing status is.

---

## ⚠️ Licensing status of the bundled text

**`apps/bibletime/public/bible-data/rvr1960.json` is under copyright and is not covered by this
project's MIT license.**

> Texto bíblico Reina-Valera 1960® © Sociedades Bíblicas en América Latina, 1960.
> Derechos renovados 1988, Sociedades Bíblicas Unidas.

| | |
| --- | --- |
| Translation | Reina-Valera 1960 (Spanish) |
| Publisher | United Bible Societies / Sociedades Bíblicas Unidas |
| Public domain? | **No.** Copyright renewed 1988 |
| Covered by BibleTime's MIT license? | **No** |
| Upstream data source | [`mrk214/bible-data-es-spa`](https://github.com/mrk214/bible-data-es-spa) |
| Version id | `149` |
| File size | ~16 MB |

The RVR1960 is one of the most widely used Spanish translations in the churches BibleTime is
built for, and it is bundled so the app works with no internet connection. **No permission to
redistribute it has been obtained by this project.**

If you fork or redistribute BibleTime, that is your call to make and your responsibility. This
project cannot grant rights it does not hold. The relevant public-domain alternative is the
**Reina-Valera 1909**, whose copyright has expired.

This is recorded here and in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) so the
situation is documented rather than silently inherited.

---

## Bundled vs. downloaded translations

BibleTime has two ways of getting Scripture text.

**Bundled** — the RVR1960 ships inside the app at
`apps/bibletime/public/bible-data/rvr1960.json`. It is available immediately, offline, with no
setup. Its id is exported as `BUNDLED_VERSION_ID` from
`apps/bibletime/src/modules/bible/services/get-bible-data.ts`.

**Downloaded on demand** — the app can fetch a catalog of additional translations and let the
user download them:

```
https://mrk214.github.io/snapshots/data.json
```

See `apps/bibletime/src/modules/bible/services/get-bible-versions.ts`. This is the only network
request BibleTime makes in normal operation, it is optional, and it is user-initiated. Once a
version is downloaded it works offline like the bundled one.

Translations obtained this way are **not** redistributed by this repository — they are fetched by
the user, from a third-party host, at the user's request. Their licensing is between the user and
whoever holds the rights to that text.

---

## Regenerating the bundled file

The committed JSON is a trimmed copy of a larger raw export. The raw file is **not** in version
control — `.gitignore` excludes `/RVR1960_vid_149.json` — because it's roughly 23.6 MB and
about 10.6 MB of that is a `chapter_html` field the app never reads.

```
RVR1960_vid_149.json  (raw, ~23.6 MB, untracked, repo root)
        │
        │  pnpm --filter web build:bible-data
        │  → apps/bibletime/scripts/build-bible-data.ts
        │    (strips chapter_html from every chapter)
        ▼
apps/bibletime/public/bible-data/rvr1960.json  (~16 MB, committed)
```

To rebuild it:

1. Place the raw export at the repository root as `RVR1960_vid_149.json`.
2. Run:

   ```bash
   pnpm --filter web build:bible-data
   ```

3. The script rewrites `apps/bibletime/public/bible-data/rvr1960.json` in place.

You only need this if the upstream data changes. For ordinary development the committed file is
all you need — `pnpm install && pnpm dev` works without the raw export.

---

## Adding another translation

Before writing any code, settle the licensing question. **A pull request that bundles a
translation without documenting its license will not be merged** — see
[`CONTRIBUTING.md`](../CONTRIBUTING.md#bundled-assets).

Prefer, in this order:

1. **Public domain** — Reina-Valera 1909, King James Version, American Standard Version
2. **Openly licensed** — World English Bible (public domain), or texts under an explicit
   redistribution grant
3. **Explicit written permission** from the rights holder, quoted in the PR

If none of those apply, the translation belongs in the **downloadable** catalog rather than
bundled in the repository.

### Data shape

Bundled translations follow the shape produced by `build-bible-data.ts`:

```jsonc
{
  "version_id": 149,
  "local_abbreviation": "RVR1960",
  "local_title": "Biblia Reina Valera 1960",
  "language": { "iso_639_1": "es", "iso_639_3": "spa", "text_direction": "ltr", /* … */ },
  "publisher": { "name": "United Bible Societies" },
  "copyright": { "text": "…", "html": "…" },
  "books": [
    {
      // book metadata
      "chapters": [
        {
          // chapter metadata; `chapter_html` is stripped by the build script
          "items": [ /* the structured verse content the app renders */ ]
        }
      ]
    }
  ]
}
```

The app renders from the structured `items` array only. Keep the `copyright` block populated —
it's what the UI can surface to attribute the text.

### Checklist for a new bundled translation

- [ ] Licensing verified and permissive, or public domain
- [ ] Row added to [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) with the actual terms
- [ ] This document updated with the new translation's provenance
- [ ] JSON matches the shape above and renders from `items`
- [ ] File size considered — every bundled translation is added to every release binary
