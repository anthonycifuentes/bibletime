## ADDED Requirements

### Requirement: Manual split of a pending verse into multiple slides
The Bible picker SHALL offer a "split into slides" action, alongside "Convertir a diapositiva", for the currently pending verse. Choosing a split count and confirming SHALL append that many consecutive slide entries to the open folder in one action, each holding a contiguous portion of the verse's text, instead of a single slide entry.

#### Scenario: Splitting a pending verse into 3 slides
- **WHEN** a verse is pending in the Bible picker and the user chooses a split count of 3 and confirms
- **THEN** 3 new slide entries are appended to the open folder, in order, together covering the verse's full text with no words dropped or duplicated

#### Scenario: Split action unavailable with no pending verse or no open folder
- **WHEN** no verse is currently pending, or no folder is open
- **THEN** the split action is unavailable, matching the existing "Convertir a diapositiva" gating

### Requirement: Split points land on clause or word boundaries
The split SHALL choose each split point at the clause-ending punctuation nearest to that split's target position in the text, falling back to the nearest whitespace if no such punctuation exists nearby. No split point SHALL fall in the middle of a word.

#### Scenario: Verse with internal punctuation
- **WHEN** splitting a verse whose text contains commas, semicolons, colons, or periods near the computed split targets
- **THEN** each split lands immediately after the nearest such punctuation to its target position

#### Scenario: Verse with no nearby punctuation at a split target
- **WHEN** a computed split target has no clause-ending punctuation nearby
- **THEN** the split falls back to the nearest whitespace, so the split never occurs inside a word

### Requirement: Each split slide identifies its part
Each slide produced by a split SHALL carry a reference label indicating which part of the verse it holds (e.g. "Génesis 1:1 (1/3)"), alongside the same Bible version and template metadata the un-split verse would have carried.

#### Scenario: Viewing a split slide in the folder
- **WHEN** a slide produced by a split is viewed in the folder grid or preview panel
- **THEN** its reference shows the verse reference plus its part number and the total part count
