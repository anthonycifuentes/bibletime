# Installing BibleTime

BibleTime is free. There's no account, no license key, and nothing to sign up for.

**[Download the latest release →](https://github.com/anthonycifuentes/bibletime/releases/latest)**

Or skip installing entirely and use it in your browser at
**<https://bibletime-app.vercel.app>**.

---

## Which file do I download?

| Your computer | File |
| --- | --- |
| Mac with Apple Silicon (M1/M2/M3/M4) | `BibleTime-<version>-arm64.dmg` |
| Mac with an Intel processor | `BibleTime-<version>-x64.dmg` |
| Windows | `BibleTime-<version>-x64.exe` |
| Linux | `BibleTime-<version>-x64.AppImage` |

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

You'll see: *"BibleTime is damaged and can't be opened"* or *"cannot be opened because the
developer cannot be verified."*

1. Open the `.dmg` and drag **BibleTime** into your **Applications** folder.
2. Open your **Applications** folder.
3. **Right-click** (or Control-click) BibleTime → **Open**.
4. Click **Open** in the dialog.

Right-clicking matters — double-clicking gives you a dialog with no "open anyway" option.

If macOS still refuses, clear the quarantine flag from Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/BibleTime.app
```

That attribute is what macOS attaches to anything downloaded from the internet. Removing it
tells macOS you trust this particular app.

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
chmod +x BibleTime-*-x64.AppImage
./BibleTime-*-x64.AppImage
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
