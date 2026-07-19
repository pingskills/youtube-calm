# Installing YouTube Calm in Safari (macOS)

These instructions cover two scenarios:

- **Personal use** — install on your own Mac, no Apple account needed
- **App Store distribution** — publish so others can download it (requires an Apple Developer account, $99/year)

---

## Requirements

- macOS 12 Ventura or later (macOS 13+ recommended)
- **Xcode** — free from the [Mac App Store](https://apps.apple.com/app/xcode/id497799835)
  - After installing, open Xcode once to accept the license agreement
  - Then install command-line tools: `xcode-select --install`

---

## Step 1 — Run the conversion script

Open **Terminal** (Applications → Utilities → Terminal), then navigate to the `safari` folder inside this project and run the build script:

```bash
cd /path/to/youtube-calm/safari
chmod +x build.sh
./build.sh
```

This creates a folder called `YouTube Calm/` inside `safari/` containing an Xcode project.

---

## Step 2 — Build the app in Xcode

1. Open the generated project:
   ```
   safari/YouTube Calm/YouTube Calm.xcodeproj
   ```
2. In Xcode, select the **YouTube Calm (macOS)** scheme in the toolbar.
3. Press **⌘R** (or Product → Run) to build and launch the app.
4. You can quit the app window that appears — the extension is now installed.

---

## Step 3 — Enable the extension in Safari

1. Open **Safari → Settings** (⌘,) → **Advanced** tab.
2. Check **"Show features for web developers"** at the bottom.
3. Go to **Safari → Develop → Allow Unsigned Extensions** (required for local installs).
   - You'll need to do this once per login session.
4. Go to **Safari → Settings → Extensions**.
5. Find **YouTube Calm** and toggle it **on**.
6. Grant permissions when Safari asks.

The extension is now active. Visit YouTube to verify it works.

---

## Updating the extension

When the source code changes, re-run `build.sh` (it overwrites the existing Xcode project), then rebuild in Xcode with **⌘R**.

---

## App Store distribution (optional)

To publish so others can install it through the App Store:

1. Enrol in the **Apple Developer Program** at [developer.apple.com](https://developer.apple.com) ($99/year).
2. In Xcode, open **Signing & Capabilities** for both targets (the app and the extension).
3. Select your team and let Xcode manage signing automatically.
4. Archive the app: **Product → Archive**.
5. Use the **Organizer** window to validate and distribute through the Mac App Store.

Each Safari extension must be submitted separately from the Chrome/Edge versions. Apple's review process typically takes 1–3 business days.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `xcrun: error: unable to find utility "safari-web-extension-converter"` | Open Xcode and accept the license; then run `xcode-select --install` |
| Extension not appearing in Safari settings | Make sure you ran the macOS scheme, not iOS |
| "Allow Unsigned Extensions" missing from Develop menu | Enable the Develop menu first (Settings → Advanced → Show features for web developers) |
| Extension turns off after restart | This is normal for unsigned extensions — re-enable "Allow Unsigned Extensions" after each login |
