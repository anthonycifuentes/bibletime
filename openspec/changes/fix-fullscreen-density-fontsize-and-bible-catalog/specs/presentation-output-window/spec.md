## Purpose

Governs how the console opens and reuses the projected output window, so that the window the operator has placed and made fullscreen on the projector is never disturbed by later sends.

## ADDED Requirements

### Requirement: Sending to an open output window does not reload it

When the console sends a slide and the output window is already open and showing the output route, the system SHALL deliver the slide to that window without navigating or reloading it, so the window's fullscreen state, position and size are preserved.

#### Scenario: Second slide while fullscreen (web)

- **WHEN** the output window is open in the web build, has been made fullscreen by the operator, and the console sends another slide (from the console, the Bible tab, or the slideshow controller)
- **THEN** the output window shows the new slide and remains fullscreen

#### Scenario: Second slide while fullscreen (desktop)

- **WHEN** the output window is open in the desktop build, is fullscreen on a second display, and the console sends another slide
- **THEN** the output window shows the new slide and remains fullscreen on that display

#### Scenario: Output window was closed

- **WHEN** the operator has closed the output window and the console sends a slide
- **THEN** a new output window is opened showing that slide

#### Scenario: Console was reloaded while the output stayed open

- **WHEN** the console page has been reloaded (so it holds no reference to the output window) while the output window remained open, and the operator sends a slide
- **THEN** the existing output window shows the new slide and is not reloaded

### Requirement: Opening the output is still a user gesture

The system SHALL only ever create a new output window synchronously inside the user gesture that triggered the send, so popup blockers do not stop it.

#### Scenario: First send from a click

- **WHEN** the operator clicks a "send to output" or "start slideshow" control and no output window exists
- **THEN** the output window opens without being blocked as a popup
