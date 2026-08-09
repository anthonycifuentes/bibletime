# Third-Party Notices

The MIT license in [`LICENSE`](./LICENSE) covers **BibleTime's own source code**. It does
**not** extend to the third-party assets bundled in this repository and shipped inside the
released applications. Those assets are listed below with the terms they arrive under.

If you fork, redistribute, or repackage BibleTime, the terms in this file apply to you for
each asset you keep. Where an entry says the terms are unverified or restrictive, that is a
statement of what we know, not a grant.

---

## Bible text

| Asset | Path | Terms |
| --- | --- | --- |
| Reina-Valera 1960 (Spanish) | `apps/bibletime/public/bible-data/rvr1960.json` | **Under copyright. Not public domain. Not covered by the MIT license.** |

> Texto bíblico Reina-Valera 1960® © Sociedades Bíblicas en América Latina, 1960.
> Derechos renovados 1988, Sociedades Bíblicas Unidas.

Publisher: United Bible Societies. Upstream data source:
[`mrk214/bible-data-es-spa`](https://github.com/mrk214/bible-data-es-spa), version id `149`.

The Reina-Valera 1960 is **not** in the public domain, and no permission to redistribute it
has been obtained by this project. It is included here for the app to function offline. If
you redistribute BibleTime, you are responsible for your own use of this text — the MIT
grant does not cover it, and this project cannot grant rights it does not hold.

See [`docs/bible-data.md`](./docs/bible-data.md) for provenance, the regeneration procedure,
and what is required to add another translation.

---

## Fonts

All font files live under `packages/fonts/`. Each licensed family ships its own license file
in its own directory; those files are authoritative and are reproduced unmodified.

| Family | Path | License | License file |
| --- | --- | --- | --- |
| Cinzel | `packages/fonts/Cinzel/` | SIL Open Font License 1.1 | `OFL.txt` |
| Geist | `packages/fonts/Geist/` | SIL Open Font License 1.1 | `OFL.txt` |
| Germania One | `packages/fonts/Germania One/` | SIL Open Font License 1.1 | `OFL.txt` |
| Limelight | `packages/fonts/Limelight/` | SIL Open Font License 1.1 | `OFL.txt` |
| Manufacturing Consent | `packages/fonts/Manufacturing Consent/` | SIL Open Font License 1.1 | `OFL.txt` |
| Mea Culpa | `packages/fonts/Mea Culpa/` | SIL Open Font License 1.1 | `OFL.txt` |
| Petit Formal Script | `packages/fonts/Petit Formal Script/` | SIL Open Font License 1.1 | `OFL.txt` |
| Quicksand | `packages/fonts/Quicksand/` | SIL Open Font License 1.1 | `OFL.txt` |
| Roboto | `packages/fonts/Roboto/` | SIL Open Font License 1.1 | `OFL.txt` |
| Smokum | `packages/fonts/Smokum/` | Apache License 2.0 | `LICENSE.txt` |
| **Essential Sans Display** | `packages/fonts/essential-sans/` | **Terms unverified — no license file in-tree** | — |

### Essential Sans Display

`packages/fonts/essential-sans/` contains ten `.woff2` files and no license file, unlike every
other family above. Its terms have **not** been verified, and it is **not** covered by the MIT
license. It is the interface font referenced by `--font-sans`.

If you are redistributing a fork, either verify that you hold a license permitting
redistribution of these files, or replace the `--font-sans` token with one of the
open-licensed families above and delete the directory.

---

## Adding a bundled asset

Any pull request that adds a font, Bible translation, image, or other bundled non-code asset
must add a corresponding row to this file naming that asset's license, and must include the
upstream license file in-tree where one exists. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md#bundled-assets).
