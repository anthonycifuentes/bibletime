## ADDED Requirements

### Requirement: Slide templates support a text animation toggle
A `SlideTemplate` SHALL have a `textAnimation` boolean field controlling whether slide text crossfades in/out when its content changes. It SHALL default to `false` for templates that predate this field.

#### Scenario: Enabling text animation
- **WHEN** a user turns on the "animate text" toggle in the template editor
- **THEN** `template.textAnimation` is set to `true` and the toggle is the only control shown for this feature — no duration, easing, or distance controls are exposed

#### Scenario: Existing templates default to no animation
- **WHEN** a template saved before this change is loaded (no `textAnimation` field present)
- **THEN** it is normalized to `textAnimation: false` and renders exactly as it did before this change

### Requirement: Text crossfades only when displayed content changes
When `textAnimation` is enabled, the slide's text and reference SHALL fade out and the new text/reference SHALL fade in whenever the displayed text or reference changes. Changing any other template property (background, font, color, spacing) SHALL NOT trigger the animation.

#### Scenario: Verse changes while animation is enabled
- **WHEN** the displayed verse text changes on a template with `textAnimation: true`
- **THEN** the previously shown text fades out, then the new text fades in

#### Scenario: Style edit does not replay the animation
- **WHEN** a user adjusts a style control (e.g. font color or background) in the editor while the displayed text stays the same
- **THEN** the text does not fade out and back in — only the style itself updates

#### Scenario: Animation disabled shows instant text changes
- **WHEN** the displayed text changes on a template with `textAnimation: false`
- **THEN** the new text is shown immediately with no fade

### Requirement: Text animation motion is fixed and subtle
The crossfade SHALL use a fixed, short, opacity-only transition (no scale, translation, or bounce easing) that is not user-configurable, so the effect cannot be adjusted into a distracting or flashy motion.

#### Scenario: Motion has no movement or scaling
- **WHEN** the text crossfade plays
- **THEN** only the text's opacity changes over the transition — its position and size remain constant throughout
