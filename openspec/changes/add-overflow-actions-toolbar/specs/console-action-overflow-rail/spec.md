## ADDED Requirements

### Requirement: A collapsed rail exposes exactly one toggle control
The overflow action rail SHALL be collapsed by default, and while collapsed SHALL render exactly one control: a toggle pill bearing a three-dots (`…`) icon. No action pill SHALL be visible or reachable while the rail is collapsed.

#### Scenario: Rail renders collapsed on first paint
- **WHEN** a rail is rendered without an explicit expanded state
- **THEN** only the three-dots toggle pill is visible, and none of its actions are shown

#### Scenario: Collapsed rail hides actions from assistive technology
- **WHEN** the rail is collapsed
- **THEN** the hidden action pills are not exposed to assistive technology and are not reachable by keyboard tabbing

### Requirement: The toggle icon reflects the rail's state
The toggle pill SHALL show a three-dots (`…`) icon while the rail is collapsed and a close (`✕`) icon while the rail is expanded. Activating the toggle SHALL invert the rail's state.

#### Scenario: Expanding swaps the icon to close
- **WHEN** a user activates the three-dots toggle of a collapsed rail
- **THEN** the rail expands and the toggle's icon becomes a close (`✕`) icon

#### Scenario: Collapsing swaps the icon back to three dots
- **WHEN** a user activates the close toggle of an expanded rail
- **THEN** the rail collapses and the toggle's icon becomes a three-dots (`…`) icon

### Requirement: The toggle carries a state-appropriate accessible label
The toggle pill SHALL carry an accessible name describing the action it will perform, distinct for each state, sourced from the active UI language rather than hard-coded English. The rail SHALL also expose its expanded/collapsed state to assistive technology.

#### Scenario: Collapsed toggle announces the open action
- **WHEN** the rail is collapsed
- **THEN** the toggle's accessible name is the localized "show extra actions" label and its expanded state is reported as collapsed

#### Scenario: Expanded toggle announces the close action
- **WHEN** the rail is expanded
- **THEN** the toggle's accessible name is the localized "hide extra actions" label and its expanded state is reported as expanded

#### Scenario: Labels follow the app language
- **WHEN** the app's UI language is changed to another supported language
- **THEN** the toggle's accessible names are rendered in that language

### Requirement: Expanding reveals the actions as connected pills
On expanding, the rail SHALL reveal each of its configured actions as a pill showing that action's icon and label, laid out as a single connected row alongside the toggle, and SHALL animate the reveal and the reverse collapse rather than snapping between states.

#### Scenario: All configured actions appear on expand
- **WHEN** a rail configured with four actions is expanded
- **THEN** four action pills are visible, each showing its own icon and label, in the configured order

#### Scenario: Expansion is animated
- **WHEN** the rail transitions between collapsed and expanded
- **THEN** the revealed or hidden pills are animated into place rather than appearing or disappearing instantly

### Requirement: Actions report activation to the caller
Activating an action pill SHALL notify the caller which action was activated, identified by that action's stable id, so the caller can run the corresponding behavior. The rail SHALL NOT itself decide what an action does.

#### Scenario: Activating a pill reports its id
- **WHEN** a user activates the action pill whose id is `remove`
- **THEN** the caller is notified that the `remove` action was activated, and no other action is reported

### Requirement: Unavailable actions render as disabled pills, not absent ones
An action marked unavailable SHALL still render in the expanded rail, in its configured position, but SHALL be visibly disabled and SHALL NOT report activation when clicked or activated by keyboard. The rail's set of pills SHALL NOT change as availability changes.

#### Scenario: Disabled pill keeps its slot
- **WHEN** one of four actions becomes unavailable while the rail is expanded
- **THEN** all four pills remain rendered in the same order, with the unavailable one shown in a disabled style

#### Scenario: Disabled pill cannot be activated
- **WHEN** a user clicks or keyboard-activates a disabled action pill
- **THEN** the caller is not notified of any action

### Requirement: The rail is fully operable by keyboard
The rail SHALL be operable without a pointer: the toggle SHALL be reachable by keyboard and activate on Enter or Space, and once expanded, every enabled action pill SHALL be reachable by keyboard tabbing and activate the same way.

#### Scenario: Keyboard opens the rail and reaches an action
- **WHEN** a user focuses the collapsed toggle and presses Enter, then tabs forward
- **THEN** the rail expands and focus moves through the enabled action pills in their configured order

#### Scenario: Keyboard activates an action
- **WHEN** an enabled action pill has keyboard focus and the user presses Enter or Space
- **THEN** the caller is notified that action was activated
