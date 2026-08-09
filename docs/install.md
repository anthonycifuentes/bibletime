# Installing BibleTime

BibleTime is free. There's no account, no license key, and nothing to sign up for.

**[Download the latest release →](https://github.com/anthonycifuentes/bibletime/releases/latest)**

Or skip installing entirely and use it in your browser at
**<https://bibletime-app.vercel.app>**.

---

## Installing the browser version as an app

The browser version can also be installed — same app, but in its own window with no tabs or
address bar around it, and its own icon next to everything else on your machine.

On the landing page there's an **install** button under the download options. It's the browser's
own button, not ours: the browser draws it, words it, and runs the install itself. Click it and
the app appears wherever your system keeps apps.

The button only shows up where the browser supports it. That's Chrome and Edge 148 and later,
and today it needs to be switched on — either by the visitor at
`about://flags/#web-app-install-element`, or by the deployment carrying an
[origin trial](https://developer.chrome.com/origintrials) token (see
[`architecture.md`](./architecture.md#the-install-element)). Everywhere else the page shows the
downloads and nothing else — no broken button.

> This installs the **web** version. It runs the same interface, but it needs a connection to
> load, and the media library is desktop-only. For a fully offline console, take the download.

---

## Which file do I download?

| Your computer | File |
| --- | --- |
| Mac with Apple Silicon (M1/M2/M3/M4) | `BibleTime-<version>-arm64.dmg` |
| Mac with an Intel processor | `BibleTime-<version>-x64.dmg` |
| Windows | `BibleTime-<version>-x64.exe` |
| Linux | `BibleTime-<version>-x86_64.AppImage` |

Not sure which Mac you have? Click the  menu → **About This Mac**. If it says "Apple M1"
or similar, take the `arm64` file. If it says "Intel", take the `x64` one.

---

## ⚠️ Your computer will warn you. This is expected.

**BibleTime's builds are not code-signed**, so every operating system will tell you the app is
unrecognized, untrusted, or damaged.

This isn't a sign that something is wrong with the download. Code signing requires a paid Apple
Developer account and a Windows certificate that together cost hundreds of dollars a year, and
BibleTime is a free project that doesn't have them yet. Without them, your OS has no way to
confirm who built the app, so it warns you.

You only need to do the following **once**, the first time you open the app.

### macOS

You'll see *"BibleTime can't be opened because Apple cannot check it for malicious software."*

1. Open the `.dmg` and drag **BibleTime** into your **Applications** folder.
2. Open it once from **Applications**. macOS refuses — click **Done**.
3. Go to  → **System Settings** → **Privacy & Security**.
4. Scroll to the **Security** section. There's a line about BibleTime being blocked, with an
   **Open Anyway** button. Click it.
5. Confirm with Touch ID or your password, then open the app again.

> **On macOS 15 (Sequoia) and newer, Control-clicking → Open no longer works.** Apple removed
> that shortcut, so System Settings is the only route through the interface. Older guides — and
> earlier versions of this one — still say to right-click; that advice is out of date.

Or do it in one line from Terminal, which works on every macOS version:

```bash
xattr -dr com.apple.quarantine /Applications/BibleTime.app
```

`com.apple.quarantine` is the flag macOS attaches to anything a browser downloads. Removing it
says you trust this particular app, and it opens normally from then on.

<details>
<summary><b>If you see "BibleTime is damaged and can't be opened"</b></summary>

That exact wording means you have a build from **v0.1.0**, which had a packaging defect: the app
bundle was left unsealed, so macOS treated it as corrupted rather than merely unsigned — a dead
end with no **Open Anyway** button at all.

**Fixed in v0.1.1.** [Download the current release](https://github.com/anthonycifuentes/bibletime/releases/latest).

To rescue a copy you already have, clear the quarantine flag with the `xattr` command above — it
works on the v0.1.0 build too.

</details>

### Windows

You'll see a blue **"Windows protected your PC"** panel from SmartScreen.

1. Click **More info**.
2. Click **Run anyway**.
3. Continue through the installer.

If your antivirus quarantines the installer, you may need to allow it explicitly. Unsigned
installers from small projects are a common false positive.

### Linux

AppImages are not executable when downloaded. Make it executable, then run it:

```bash
chmod +x BibleTime-*-x86_64.AppImage
./BibleTime-*-x86_64.AppImage
```

Or via your file manager: right-click → **Properties** → **Permissions** → check *Allow
executing file as program*.

If the AppImage won't start, you may be missing FUSE:

```bash
sudo apt install libfuse2      # Debian / Ubuntu
```

---

## Setting up your projector

BibleTime uses two windows: the **console** you work in, and the **output** your congregation
sees.

1. Connect your projector or second screen before opening BibleTime.
2. Set your displays to **extended** mode, not mirrored — mirroring shows the congregation your
   control panel.
3. Open BibleTime and click **Present**. The output window goes to the second display.

The console stays on your laptop screen. Nothing from it leaks into the projected output.

---

## Bible translations

The **Reina-Valera 1960** is bundled and works completely offline.

Additional translations can be added from within the app, which downloads them from a public
catalog — that step needs an internet connection, but only once. After that they work offline
too. See [`bible-data.md`](./bible-data.md).

---

## Updating

BibleTime has no auto-updater yet. To update, download the new release and install it over the
old one. Your projects, media, and settings are stored separately and are not affected.

Watch the repository on GitHub (**Watch** → **Custom** → **Releases**) to be notified when a new
version ships.

---

## Something not working?

- Check the [existing issues](https://github.com/anthonycifuentes/bibletime/issues).
- [Open a bug report](https://github.com/anthonycifuentes/bibletime/issues/new/choose) — include
  your OS and the BibleTime version, since those two decide most answers.
- Found a security problem? Don't post it publicly — see [SECURITY.md](../SECURITY.md).
