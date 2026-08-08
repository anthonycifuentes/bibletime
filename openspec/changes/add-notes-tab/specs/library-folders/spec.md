## ADDED Requirements

### Requirement: A folder item may be an note
The system SHALL support `note` as a folder item type alongside `bible-passage`, `song`, and `media`, carrying its own body text, an optional heading, and a non-empty list label. An `note` item SHALL render real content from the moment it is created and SHALL NOT be treated as an unresolvable type, so it is never rendered as a "not yet available" placeholder.

#### Scenario: Note items live in folders like any other type

- **WHEN** a folder contains `bible-passage`, `song`, and `note` items
- **THEN** all three appear in one ordered list, each rendering its own real content, and every console operation applies to them uniformly

#### Scenario: Note items are never placeholders

- **WHEN** a folder contains an `note` item
- **THEN** it renders its body text as the slide, and the placeholder path for unresolvable item types is not used for it

#### Scenario: Adding the type breaks no stored folder

- **WHEN** a project saved before notes existed is opened
- **THEN** all of its folders and items load unchanged, with no migration and no new required field on any existing item

#### Scenario: Note items round-trip through project export

- **WHEN** a project containing `note` items is exported to a project file and opened again
- **THEN** every note item is restored with its text, heading, label, order, and template

### Requirement: Every folder item type has a non-empty list label
The system SHALL derive a non-empty label for every folder item type when listing items in the folder tree and the slide console. For an `note` item the label SHALL be the label stored on the item, which is derived at add-time and never empty.

#### Scenario: Every item in the tree is identifiable

- **WHEN** a folder containing every supported item type is expanded in the folder tree
- **THEN** each item row shows a non-empty label, and no row renders as a blank line

#### Scenario: A heading-less note still has a row label

- **WHEN** an note with no heading is listed in the folder tree
- **THEN** the row shows the truncated body text stored as its label
