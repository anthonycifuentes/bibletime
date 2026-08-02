## ADDED Requirements

### Requirement: Chapter column width matches its content
The Bible tab's chapter column SHALL be sized to the intrinsic width of the chapter-number buttons it renders, rather than a fixed width wider than that content, so no empty space renders to the right of a chapter-number button.

#### Scenario: Chapter column has no trailing empty space
- **WHEN** the chapter column renders its list of single-column chapter-number buttons
- **THEN** the column's rendered width matches the width of the chapter-number buttons, with no empty space to the right of a button

### Requirement: Chapter buttons show only the chapter number
Each chapter entry in the chapter column SHALL display only the chapter's number, with no additional label or text.

#### Scenario: A chapter entry shows just its number
- **WHEN** the chapter column renders an entry for a given chapter
- **THEN** the entry's visible text is only that chapter's number
