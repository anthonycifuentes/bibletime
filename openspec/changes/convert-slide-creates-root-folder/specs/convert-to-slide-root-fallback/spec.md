## ADDED Requirements

### Requirement: Convert to Slide creates a root folder when none is open
When the user clicks "Convert to Slide" and no folder is currently open in the console, the system SHALL create a new folder at the root level (no parent folder), positioned before every other existing root-level folder, add the converted verse to it as its first slide, and open that folder in the console — instead of the action being unavailable.

#### Scenario: Converting a verse with no folder open and no existing folders
- **WHEN** the library has no folders yet and the user enters a valid verse reference and clicks "Convert to Slide"
- **THEN** a new root-level folder is created with a default name, the converted verse becomes its first slide, and the folder opens in the console showing that slide

#### Scenario: Converting a verse with no folder open but other root folders exist
- **WHEN** one or more root-level folders already exist, none is currently open, and the user clicks "Convert to Slide" with a valid pending verse
- **THEN** a new root-level folder is created and inserted before all existing root-level folders in display order, the converted verse becomes its first slide, and the folder opens in the console
- **AND** the existing root folders' stored order is unchanged

#### Scenario: Convert to Slide is enabled without an open folder
- **WHEN** no folder is open and the user has entered a valid verse reference and text
- **THEN** the "Convert to Slide" button SHALL be enabled (no longer disabled solely because no folder is open)

#### Scenario: Subsequent conversions target the newly opened folder
- **WHEN** the user converts a verse with no folder open (creating and opening a new root folder), then immediately converts a second verse without selecting a different folder
- **THEN** the second slide is added to the same newly created folder (now the open folder), not a second new root folder

### Requirement: Present and Split remain gated on an open folder
"Present" and "Split into slides" SHALL continue to require an already-open folder and SHALL remain disabled, with their existing hint, when no folder is open.

#### Scenario: Present stays disabled with no folder open
- **WHEN** no folder is open in the console
- **THEN** the "Present" button remains disabled and the existing hint is still shown for it
