## ADDED Requirements

### Requirement: The site root is a public landing page
The system SHALL render a public landing page at the site root (`/`), and SHALL NOT redirect the root to the console. The console SHALL remain reachable at `/library`.

#### Scenario: Visiting the root shows the landing page
- **WHEN** a visitor opens `/` in a browser
- **THEN** the landing page renders, and no redirect to `/library` occurs

#### Scenario: The console is untouched
- **WHEN** a visitor opens `/library`
- **THEN** the console shell renders exactly as it did before this change

### Requirement: The landing page identifies the app and what it is for
The landing page SHALL present the app's identity — its icon, its name, and a one-sentence description of what it does — above or before any feature content, without requiring the visitor to scroll.

#### Scenario: Identity is visible on first paint
- **WHEN** the landing page loads on a desktop viewport
- **THEN** the app icon, the name "BibleTime", and a one-sentence description are visible without scrolling

### Requirement: The landing page showcases the app's capabilities as bento cards
The landing page SHALL present the app's capabilities as a grid of cards, each card covering one capability with a title, a short description, and an image slot. The card set SHALL cover, at minimum: the Bible reader, songs, media and notes, slide templates and backgrounds, the presentation output window, and that the app works offline.

#### Scenario: Every showcased capability has a card
- **WHEN** the landing page renders
- **THEN** there is one card for each of the Bible reader, songs, media and notes, templates and backgrounds, the presentation output, and offline use — each with a title, a short description, and an image slot

#### Scenario: Cards are laid out as a bento grid
- **WHEN** the landing page renders on a wide viewport
- **THEN** the cards form a grid of mixed cell sizes rather than a uniform list

### Requirement: The primary action downloads the app for free
The landing page SHALL present a primary action that leads to the project's GitHub Releases page, and SHALL state that the app is free of charge. The page SHALL name the platforms the desktop app is published for (macOS, Windows, Linux).

#### Scenario: Download action targets GitHub Releases
- **WHEN** a visitor activates the primary download action
- **THEN** they are taken to `https://github.com/anthonycifuentes/bibletime/releases`

#### Scenario: Free is stated, not implied
- **WHEN** a visitor reads the area around the primary action
- **THEN** the copy states that the app is free of charge

#### Scenario: Supported platforms are named
- **WHEN** a visitor looks at the download area
- **THEN** macOS, Windows, and Linux are named as the platforms the desktop app is published for

### Requirement: A secondary action opens the web app
The landing page SHALL present a secondary action that navigates to the console at `/library`, so a visitor can use the app without installing anything.

#### Scenario: Secondary action enters the console
- **WHEN** a visitor activates the secondary action
- **THEN** the app navigates to `/library` within the same site

### Requirement: The landing page asks nothing of the visitor
The landing page SHALL NOT present a sign-up, sign-in, email capture, payment, pricing, or trial affordance of any kind.

#### Scenario: No account or payment affordances exist
- **WHEN** a visitor reads the entire landing page
- **THEN** there is no sign-up form, no sign-in link, no email field, no price, and no purchase or trial action

### Requirement: Screenshots render as placeholders until real images exist
Every image slot on the landing page SHALL reserve its final aspect ratio and render a neutral placeholder when no image file is available, and SHALL render the image once one exists — without any change to layout, component code, or card structure.

#### Scenario: A missing screenshot shows a placeholder, not a broken image
- **WHEN** the landing page renders and a card's image file is not present
- **THEN** that card shows a neutral placeholder occupying the image's final aspect ratio, and no broken-image indicator appears

#### Scenario: Adding a screenshot does not shift the layout
- **WHEN** a real image file is added for a card
- **THEN** the image renders in the same box the placeholder occupied, and surrounding cards do not move

#### Scenario: Swapping an image is a content-only edit
- **WHEN** a maintainer replaces a card's screenshot
- **THEN** the only edits required are adding the image file and changing that card's image path in the content manifest

### Requirement: The landing page is localized in every language the app supports
All visitor-facing text on the landing page SHALL come from the app's translation dictionaries and SHALL be available in English, Spanish, and Portuguese, following the same locale resolution the rest of the app uses.

#### Scenario: Landing copy follows the resolved locale
- **WHEN** the resolved locale is Spanish or Portuguese
- **THEN** every heading, description, action label, and footer string on the landing page renders in that language

#### Scenario: No hard-coded copy
- **WHEN** the landing page's components are inspected
- **THEN** no visitor-facing string is hard-coded outside the dictionaries, other than the product name "BibleTime"

### Requirement: The landing page adapts to the viewport
The landing page SHALL be usable from a narrow phone viewport up to a wide desktop viewport, collapsing the bento grid to a single column on narrow viewports, with no horizontal page scrolling at any width.

#### Scenario: Narrow viewport stacks the grid
- **WHEN** the landing page renders at a phone-width viewport
- **THEN** the cards are stacked in a single column and the page does not scroll horizontally

#### Scenario: Actions stay reachable on narrow viewports
- **WHEN** the landing page renders at a phone-width viewport
- **THEN** the download and open-in-browser actions remain visible and tappable without horizontal scrolling

### Requirement: The landing page uses the app's own visual language
The landing page SHALL be built from the app's existing design tokens — its neutral palette, its `--signal` accent, its radii, and its `Essential Sans Display` type — and SHALL render correctly in both the light and dark themes. It SHALL NOT introduce new color values, fonts, or design-system components.

#### Scenario: Both themes render correctly
- **WHEN** the landing page is viewed with the dark theme active and again with the light theme active
- **THEN** all text meets its surface with legible contrast in both, and no element renders with an unreadable or transparent background

#### Scenario: No new tokens or primitives
- **WHEN** the landing implementation is inspected
- **THEN** its colors, radii, and fonts resolve to existing theme tokens, and it adds no component to the shared design-system package

### Requirement: The landing page declares its own document metadata
The root route SHALL set a document title and description describing the app for someone who has never used it, rather than inheriting the console's defaults.

#### Scenario: Root route has landing-specific metadata
- **WHEN** `/` is requested
- **THEN** the served document's title and meta description describe BibleTime as a free Bible presentation app, distinct from the console's own title
