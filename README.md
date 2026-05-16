# Task Capture

Quick voice/text capture of personal tasks from Obsidian into the FJG Taskboard dashboard.

This plugin no longer writes captured tasks to `08 Tasks/Tasks.md`. Instead, it sends new tasks to the taskboard API:

```text
Obsidian plugin -> https://fjg-taskboard.netlify.app/api/mutate -> Netlify Blobs
```

That keeps Obsidian useful as a mobile capture surface while avoiding Obsidian Sync/Git conflicts in the vault task file.

This is the sibling plugin to [agenda-capture](https://github.com/jajuangarrett-ctrl/agenda-capture) -- same voice pipeline, different destination.

## Buckets

| Bucket   | Meaning                              |
|----------|--------------------------------------|
| Do First | Urgent + important. Today/this week. |
| Do Soon  | Important, not urgent. This month.   |
| Delegate | Needs someone else's hands.          |
| Waiting  | Blocked on someone else's reply.     |
| On-Hold  | Paused or not active right now.      |

## Commands

- **Capture task** -- opens the capture modal, also bound to the checklist ribbon icon.

## Capture Modal

| Field  | Notes |
|--------|-------|
| Status | Bucket/status dropdown. Last-used status is preselected. |
| Task   | Type or use the Record button below. |
| Voice  | Tap Record, dictate, tap Stop. Whisper transcribes; Claude cleanup is optional. |

After save, the modal reopens with the same status preselected if "Show another after save" is enabled.

## Settings

| Setting                 | Default |
|-------------------------|---------|
| Taskboard URL           | `https://fjg-taskboard.netlify.app` |
| Dashboard password      | blank |
| Show another after save | on |
| OpenAI API key          | blank |
| Anthropic API key       | blank |
| Custom acronyms         | `CalWORKs, VPSS, FJG` |

The dashboard password is the same password used to unlock the FJG Taskboard web app. It is stored locally in Obsidian plugin data.

## Voice Pipeline

MediaRecorder -> OpenAI Whisper -> optional Claude cleanup -> taskboard API.

Cleanup is skipped if no Anthropic key is configured. The cleanup prompt is tuned for personal task notes and preserves configured acronyms/proper nouns.

## iPhone Launch Shortcut

After installing on iPhone via BRAT, install the **Advanced URI** community plugin if not already installed, then build a one-action iOS Shortcut:

- Action: **Open URL**
- URL: `obsidian://advanced-uri?vault=FJG%20Vault&commandid=task-capture%3Acapture`

Add the Shortcut to your home screen as a Shortcuts widget.

## Install

### BRAT

1. Install [Obsidian42 BRAT](https://github.com/TfTHacker/obsidian42-brat) if not already installed.
2. BRAT settings -> Add Beta Plugin -> paste this repo's URL.
3. Enable "Task Capture" in Community Plugins.
4. Open Task Capture settings and set the dashboard password.

### Manual Desktop Testing

1. `npm install && npm run build`
2. Copy `manifest.json`, `main.js`, and `styles.css` to `<vault>/.obsidian/plugins/task-capture/`.
3. Reload Obsidian, enable in Community Plugins.

## Develop

```bash
npm install
npm run dev
npm run build
npm test
```

## License

MIT
