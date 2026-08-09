# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security vulnerability.** A public issue tells
everyone about the problem before there is a fix, including people who would use it.

Report it privately instead:

**[Open a private security advisory →](https://github.com/anthonycifuentes/bibletime/security/advisories/new)**

That form is private between you and the maintainer. If you can't access it, send a direct
message to [@anthonycifuentes](https://github.com/anthonycifuentes) on GitHub asking for a
private channel — don't include the details in the first message.

### What to include

- What the issue is, and what an attacker could do with it
- Steps to reproduce it, or a proof of concept
- The BibleTime version and platform (desktop macOS/Windows/Linux, or the web app)
- Anything you think we'd get wrong about the impact

### What to expect

| | |
| --- | --- |
| First response | Within 7 days |
| Assessment and plan | Within 14 days of the first response |
| Fix released | Depends on severity — critical issues are prioritized over all other work |

You'll be kept updated while we work on it. If we disagree that something is a vulnerability,
we'll tell you why rather than going quiet.

Credit is given in the release notes unless you'd rather stay anonymous — just say so.

## Supported versions

BibleTime is pre-1.0. Only the most recent release line receives fixes.

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |
| < 0.1 | ❌ (no public releases before 0.1.0) |

## Scope

BibleTime is a **local-first desktop and web application**. It has no accounts, no server, and
no backend of its own — content and service plans live on the user's machine.

**In scope:**

- Remote code execution or privilege escalation through the desktop app
- Weaknesses in the Electron configuration — context isolation, the preload bridge, the
  `setWindowOpenHandler` policy, navigation handling
- Path traversal or arbitrary file read/write through project file loading, media import, or
  export
- Cross-site scripting in the web app, including through imported content such as song lyrics,
  notes, or slide text
- Anything that lets untrusted content in a project file execute code

**Out of scope:**

- Vulnerabilities in the Vercel-hosted demo at `https://bibletime-app.vercel.app` that come
  from Vercel's platform rather than this code — report those to Vercel
- Missing code signing on release binaries. This is [known and
  documented](./docs/install.md); the builds are unsigned because no certificates exist yet
- Reports produced solely by an automated scanner with no demonstrated impact
- Social engineering, physical access, or denial of service against a user's own machine

## A note on bundled content

BibleTime bundles third-party assets, including Bible text and fonts. Licensing questions about
those are not security issues — see [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) and
open a regular issue.
