## ADDED Requirements

### Requirement: Exported projects carry each slide's speaker notes

A project file SHALL include the speaker notes stored on every slide, so a running order shared with another operator arrives with its notes intact.

#### Scenario: Exporting

- **WHEN** a project whose slides carry speaker notes is exported to a file
- **THEN** each slide's notes are written into that file

#### Scenario: Importing

- **WHEN** that file is opened, on this machine or another
- **THEN** every slide's speaker notes are restored onto the matching slide

#### Scenario: Files written before speaker notes existed

- **WHEN** a project file written before speaker notes existed is opened
- **THEN** it opens normally, with its slides holding no notes and no error

#### Scenario: Files carrying notes opened by an older build

- **WHEN** a project file carrying speaker notes is opened by a build that does not know about them
- **THEN** the project opens with its folders and slides intact, and the notes are simply absent
