## ADDED Requirements

### Requirement: Feature cards expand in place
The system SHALL let a visitor expand a landing feature card in place. An expanded card SHALL occupy a larger cell in the same grid — it SHALL NOT open a dialog, a new page, or an overlay — and SHALL reveal a longer description and a larger image than its collapsed state.

#### Scenario: Activating a card expands it
- **WHEN** a visitor activates a collapsed feature card
- **THEN** that card grows into a larger cell of the same grid, showing its longer description and a larger image, with no dialog or overlay opened

#### Scenario: Activating an expanded card collapses it
- **WHEN** a visitor activates the card that is currently expanded
- **THEN** it returns to its collapsed size and its longer description is no longer shown

### Requirement: At most one card is expanded at a time
The system SHALL keep at most one feature card expanded. Expanding a card SHALL collapse any other expanded card.

#### Scenario: Expanding a second card collapses the first
- **WHEN** one card is expanded and the visitor activates a different card
- **THEN** the newly activated card is expanded and the previously expanded card is collapsed

#### Scenario: The page opens fully collapsed
- **WHEN** the landing page first renders
- **THEN** no card is expanded

### Requirement: Cards are operable by keyboard
Each feature card SHALL be a single focusable control that is reachable by Tab, activated by Enter or Space, and exposes its expanded state to assistive technology. Escape SHALL collapse the expanded card.

#### Scenario: Keyboard activation expands a card
- **WHEN** a visitor focuses a collapsed card and presses Enter or Space
- **THEN** the card expands, exactly as it would on a pointer click

#### Scenario: Escape collapses the expanded card
- **WHEN** a card is expanded and the visitor presses Escape
- **THEN** the card collapses and focus remains on that card's control

#### Scenario: Expanded state is announced
- **WHEN** a screen reader reaches a feature card
- **THEN** the card is announced as an expandable control whose state reflects whether it is currently expanded

#### Scenario: Focus is not lost on collapse
- **WHEN** a card collapses for any reason while it holds focus
- **THEN** focus stays on that card's control rather than moving to the document body

### Requirement: Collapsed cards signal that they expand
Each collapsed feature card SHALL carry a persistent visual affordance indicating it can be expanded, visible without hovering.

#### Scenario: The affordance is visible before interaction
- **WHEN** the landing page renders on a device with no hover capability
- **THEN** each collapsed feature card shows its expand affordance

### Requirement: Expansion animates, unless the visitor asked it not to
The system SHALL animate the size change between the collapsed and expanded states, and SHALL render the change without animation when the visitor's system requests reduced motion.

#### Scenario: Reduced motion skips the animation
- **WHEN** the visitor's system requests reduced motion and a card is expanded
- **THEN** the card changes to its expanded state without an animated transition, and the expanded content is fully shown

### Requirement: Expansion works in a single-column layout
On viewports where the bento grid collapses to a single column, expanding a card SHALL grow it vertically in place, keeping the activated card in view.

#### Scenario: Single-column expansion keeps the card in view
- **WHEN** a visitor expands a card on a phone-width viewport
- **THEN** the card grows vertically within the single column and remains visible without the visitor having to hunt for it

### Requirement: Expansion carries no navigation or side effects
Expanding or collapsing a card SHALL NOT navigate, change the URL, or alter any stored state. It SHALL NOT be required in order to reach the download or open-in-browser actions.

#### Scenario: Expanding leaves the URL alone
- **WHEN** a visitor expands and collapses several cards
- **THEN** the browser URL is unchanged and no browser history entry is added

#### Scenario: Actions are reachable without expanding anything
- **WHEN** a visitor never expands a card
- **THEN** the download action and the open-in-browser action are still fully visible and usable
