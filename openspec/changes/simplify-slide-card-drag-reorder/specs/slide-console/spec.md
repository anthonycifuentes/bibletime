## ADDED Requirements

### Requirement: Slide card shows only the live preview
Each slide card in the main container SHALL render only the slide's live preview. The card SHALL NOT render an index number, reference/type text, or per-card action buttons.

#### Scenario: Card renders with no footer chrome
- **WHEN** a folder's items are rendered as slide cards
- **THEN** each card shows only its live preview, with no visible index, reference text, type label, or action buttons on the card itself

### Requirement: Slides are reordered via drag-and-drop with a visible drag handle
The system SHALL allow a user to reorder slides within the open folder by dragging a slide card to a new position, and SHALL show a drag-handle icon anchored above each card's upper-right corner to indicate the card is draggable. Dragging SHALL be initiated only from the drag handle, not from clicking elsewhere on the card.

#### Scenario: Drag handle is visible above each card
- **WHEN** a folder's items are rendered as slide cards
- **THEN** a drag-handle icon appears above the upper-right corner of each card

#### Scenario: Dragging a card reorders the slide list
- **WHEN** a user drags a card's drag handle to a new position among the folder's slides
- **THEN** the slide list reflects the new order once the drag completes, and the new order is persisted

#### Scenario: Clicking the card body still selects instead of dragging
- **WHEN** a user clicks (without dragging) anywhere on a card other than the drag handle
- **THEN** the card's selection state toggles as before, and no reorder is triggered

### Requirement: Slides are removed via a bulk selection-toolbar action
The system SHALL allow a user to remove the currently selected slide(s) from the open folder via a "Remove selected" action in the selection toolbar. Individual slide cards SHALL NOT expose a per-card remove control.

#### Scenario: Remove one selected slide
- **WHEN** exactly one slide is selected and the user triggers "Remove selected"
- **THEN** that slide is removed from the folder and no longer rendered

#### Scenario: Remove multiple selected slides
- **WHEN** several slides are selected and the user triggers "Remove selected"
- **THEN** all selected slides are removed from the folder, and unselected slides remain unaffected

#### Scenario: Remove action unavailable with no selection
- **WHEN** no slide is currently selected
- **THEN** the "Remove selected" action is not available to trigger
