## ADDED Requirements

### Requirement: Preview honors the configured aspect ratio
Any `SlideFrame` instance (the console's main preview panel, the `/present` output window) SHALL render the slide at exactly the aspect ratio currently configured in Settings, fitted (letterboxed or pillarboxed) within whatever box its parent provides, regardless of that box's own shape.

#### Scenario: Panel shape doesn't match the configured ratio
- **WHEN** the configured aspect ratio is 16:9 and the console's preview panel renders in a box whose own width:height shape is different from 16:9 (e.g. a tall, narrow panel)
- **THEN** the slide renders at a 16:9 box that fits entirely within the panel, centered, rather than stretching to fill the panel's own shape

#### Scenario: Aspect ratio setting changes while a preview is visible
- **WHEN** the user changes the aspect ratio setting (e.g. from 16:9 to 9:16) while the console's preview panel is showing a slide
- **THEN** the preview box reflows to the new ratio's shape within its panel without a page reload

#### Scenario: Output window matches the configured ratio
- **WHEN** the `/present` output window is open on a display whose own aspect ratio differs from the configured ratio
- **THEN** the slide renders letterboxed/pillarboxed at the configured ratio against a black background, not stretched to the display's shape

### Requirement: Preview text scales proportionally to the rendered preview size
A `SlidePreview` rendered inside a `SlideFrame` SHALL scale the template's font size (and dependent px-based text metrics) in proportion to the preview's actual rendered width, so the preview is a faithful, correctly-proportioned miniature of the real output rather than showing text at a fixed, unscaled size.

#### Scenario: Preview panel is smaller than real output resolution
- **WHEN** a template's font size is authored for full output resolution and the console's preview panel renders at a fraction of that width
- **THEN** the previewed text renders at a proportionally smaller size matching that fraction, not at the template's literal pixel value

#### Scenario: Preview panel is resized
- **WHEN** the preview panel's rendered width changes (window resize, sidebar resize, or an aspect ratio change that alters the fitted box's width)
- **THEN** the previewed text's rendered size updates to match the new width's proportion of the reference output width

#### Scenario: Caller supplies an explicit scale
- **WHEN** a consumer of `SlidePreview` passes an explicit `scale` prop
- **THEN** that explicit value is used as-is and is not overridden by the automatically computed scale
