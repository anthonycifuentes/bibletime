## ADDED Requirements

### Requirement: The project is licensed under MIT

The repository SHALL contain a `LICENSE` file at its root holding the unmodified text of the MIT License, with a copyright line naming Anthony Cifuentes and the year 2026. The text SHALL NOT be altered, so that automated license detection identifies the project as MIT.

#### Scenario: License file present and detected

- **WHEN** the repository is viewed on GitHub
- **THEN** a `LICENSE` file exists at the root
- **AND** GitHub's repository sidebar reports the license as "MIT"

#### Scenario: License text is verbatim

- **WHEN** `LICENSE` is compared against the canonical MIT License text
- **THEN** the only differences are the copyright year and holder name

#### Scenario: Package metadata agrees with the license file

- **WHEN** `apps/desktop/package.json` is inspected
- **THEN** its `license` field is `"MIT"`
- **AND** it declares `repository` and `homepage` fields pointing at the GitHub repository and `https://bibletime-app.vercel.app`

### Requirement: Third-party bundled assets are enumerated with their terms

The repository SHALL contain `THIRD_PARTY_NOTICES.md` listing every bundled non-code asset, its path in the tree, and the terms it is distributed under. The MIT grant in `LICENSE` covers BibleTime's own source code only, and `THIRD_PARTY_NOTICES.md` SHALL state this boundary explicitly.

#### Scenario: Notices file states the license boundary

- **WHEN** a reader opens `THIRD_PARTY_NOTICES.md`
- **THEN** it states that the MIT license applies to BibleTime's source code and does not extend to the bundled assets listed in the file

#### Scenario: Open font licenses are attributed

- **WHEN** the notices file is checked against the contents of `packages/fonts/`
- **THEN** every font directory shipping an `OFL.txt` or `LICENSE.txt` is listed as SIL OFL 1.1 with its in-tree license path

#### Scenario: Fonts without license files are marked unverified

- **WHEN** the notices file describes `packages/fonts/essential-sans/`
- **THEN** it records that no license file accompanies those files in-tree
- **AND** it states that their terms are unverified and not covered by the MIT license

### Requirement: The bundled Bible text is attributed and excluded from the MIT grant

`THIRD_PARTY_NOTICES.md` SHALL identify `apps/bibletime/public/bible-data/rvr1960.json` as the Reina-Valera 1960 text, name Sociedades Bíblicas Unidas as the copyright holder, and state that the file is not public domain and is not covered by the project's MIT license.

#### Scenario: Bible text is called out by name and holder

- **WHEN** a reader looks up the Bible data entry in `THIRD_PARTY_NOTICES.md`
- **THEN** it names the translation, the copyright holder, and the file path
- **AND** it states plainly that the text is under copyright and is not granted under MIT

#### Scenario: Provenance is recorded

- **WHEN** a reader follows the notices file to `docs/bible-data.md`
- **THEN** the upstream source repository and version identifier of the data are recorded
- **AND** the procedure for regenerating the trimmed JSON from the raw export is documented

### Requirement: New bundled assets must arrive with their terms recorded

`CONTRIBUTING.md` SHALL require that any pull request adding a bundled non-code asset — a font, a Bible translation, an image, or media — also adds a corresponding entry to `THIRD_PARTY_NOTICES.md` stating that asset's license.

#### Scenario: Contribution rules cover new assets

- **WHEN** a contributor reads the contribution guidelines
- **THEN** they are told that adding a bundled asset requires a matching `THIRD_PARTY_NOTICES.md` entry naming its license

#### Scenario: Reviewer has a stated basis to reject

- **WHEN** a pull request adds a font or translation with no notices entry and no license information
- **THEN** the documented rules identify this as an incomplete contribution
