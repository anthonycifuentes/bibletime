## ADDED Requirements

### Requirement: Preview column offers a Present action
The Bible picker's Preview column SHALL offer a "Present" action alongside "Convert to Slide". Activating it SHALL convert the currently previewed verse into a slide in the open Library folder, exactly as "Convert to Slide" does, and immediately send that slide to the presentation output.

#### Scenario: Presenting the previewed verse
- **WHEN** a verse is previewed in the Preview column and the user activates "Present"
- **THEN** the verse is added to the open Library folder as a slide, and the presentation output immediately shows that slide

#### Scenario: No verse previewed
- **WHEN** no verse is currently previewed, or no Library folder is open
- **THEN** the "Present" action is disabled, matching the conditions under which "Convert to Slide" is disabled

### Requirement: Double-click on a verse converts and presents it
Double-clicking a verse in the Bible reader's verse list SHALL perform the same conversion and immediate presentation as the Preview column's "Present" action, for that verse.

#### Scenario: Double-clicking a verse in the list
- **WHEN** the user double-clicks a verse in the Bible reader's verse list
- **THEN** that verse is added to the open Library folder as a slide, and the presentation output immediately shows it, without requiring a separate click on "Convert to Slide" or "Present"

#### Scenario: Double-clicking with no open Library folder
- **WHEN** the user double-clicks a verse while no Library folder is open
- **THEN** the double-click has no effect, consistent with "Convert to Slide" and "Present" being disabled in that state

### Requirement: Double-click on an existing slide card presents it
Double-clicking a slide card in the console's folder grid SHALL immediately send that exact slide to the presentation output, without requiring the user to first select the card and then activate a separate "send to output" action.

#### Scenario: Double-clicking a slide already in the open folder
- **WHEN** the user double-clicks a slide card in the folder grid
- **THEN** that slide becomes selected and the presentation output immediately shows it, matching what a single click followed by "Send to output" would have produced

