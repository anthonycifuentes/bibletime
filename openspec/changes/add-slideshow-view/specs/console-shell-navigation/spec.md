## ADDED Requirements

### Requirement: The slideshow is a top-level destination

The app SHALL provide a `/slideshow` route that replaces the console shell for its duration, rather than rendering inside it.

#### Scenario: Entering the slideshow

- **WHEN** the user starts a slideshow from the console
- **THEN** the app navigates to `/slideshow`, and the console's header bar, bottom drawer, folder tree, slide grid, and preview panel are no longer rendered

#### Scenario: Leaving the slideshow

- **WHEN** the user exits the slideshow
- **THEN** the app navigates back to `/library`

#### Scenario: Console shell state survives the round trip

- **WHEN** the user enters and leaves the slideshow
- **THEN** the open folder, the bottom drawer's active tab, and the console's other shell state are unchanged, exactly as they are for the template editor route

#### Scenario: Reached without a deck

- **WHEN** `/slideshow` is opened directly with no open folder, an unknown folder, or an empty folder
- **THEN** the user is redirected to `/library`
