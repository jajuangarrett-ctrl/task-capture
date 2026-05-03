# Task Capture

Quick voice/text capture of personal tasks into a single bucketed master file in your Obsidian vault.

Each captured task lands as a `- [ ] task text` checkbox bullet at the **top** of one of four fixed bucket headings in `<vault>/08 Tasks/Tasks.md`. The freshest capture is always visible without scrolling.

This is the sibling plugin to [agenda-capture](https://github.com/jajuangarrett-ctrl/agenda-capture) — same voice pipeline, different data model.

## Buckets

| Bucket   | Meaning                                           |
|----------|---------------------------------------------------|
| Do First | Urgent + important. Today/this week.              |
| Do Soon  | Important, not urgent. This month.                |
| Delegate | Needs someone else's hands.                       |
| Waiting  | Blocked on someone else's reply or action.        |

Bucket order and names are fixed in v0.1. Edit the source if you want to change them.

## Vault layout

```
<vault>/08 Tasks/Tasks.md
```

```markdown
---
type: tasks-master
---

## Do First
- [ ] (newest task here, then older below)
- [ ] (older task)

## Do Soon
- [ ] task

## Delegate
- [ ] task

## Waiting
- [ ] task
```

The plugin auto-creates `Tasks.md` on first save with all four bucket headings pre-seeded. If the file already exists with some headings missing, missing ones are appended.

## Commands

- **Capture task** — opens the capture modal (also bound to the checklist ribbon icon)

## Capture modal

| Field   | Notes                                            |
|---------|--------------------------------------------------|
| Bucket  | Dropdown of the 4 fixed buckets. Last-used preselected. |
| Task    | Type or use the Record button below.             |
| Voice   | Tap Record -> dictate -> tap Stop. Whisper transcribes; Haiku cleans. |

After save: notice + the modal reopens with the same bucket preselected if "Show another after save" is enabled.

## Voice pipeline

Identical architecture to agenda-capture: MediaRecorder -> OpenAI Whisper -> Claude Haiku 4.5 cleanup -> textarea. Cleanup is skipped if no Anthropic key is configured.

System prompt for cleanup is tuned for personal task notes (not agenda items about direct reports) and pins your custom acronyms verbatim.

## Settings

| Setting                  | Default                  |
|--------------------------|--------------------------|
| Tasks file path          | `08 Tasks/Tasks.md`      |
| Show another after save  | on                       |
| OpenAI API key           | -                        |
| Anthropic API key        | -                        |
| Custom acronyms          | `CalWORKs, VPSS, FJG`    |

## iPhone launch shortcut

After installing on iPhone via BRAT, install the **Advanced URI** community plugin if not already, then build a one-action iOS Shortcut:

- Action: **Open URL**
- URL: `obsidian://advanced-uri?vault=FJG%20Vault&commandid=task-capture%3Acapture`

Add the Shortcut to your home screen as a Shortcuts widget. Pair it next to your agenda-capture widget for two-tap quick-capture.

## Install

### BRAT (recommended for mobile)

1. Install [Obsidian42 BRAT](https://github.com/TfTHacker/obsidian42-brat) if not already installed.
2. BRAT settings -> Add Beta Plugin -> paste this repo's URL.
3. Enable "Task Capture" in Community Plugins.

### Manual (desktop testing)

1. `npm install && npm run build`
2. Copy `manifest.json`, `main.js`, and `styles.css` to `<vault>/.obsidian/plugins/task-capture/`.
3. Reload Obsidian (Ctrl/Cmd+R), enable in Community Plugins.

## Develop

```
npm install
npm run dev    # esbuild watch mode
npm run build  # production build (typecheck + minified bundle)
npm test       # vitest unit tests for markdown surgery
```

## License

MIT
