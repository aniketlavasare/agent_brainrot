# Agent Brainrot (Chrome MV3)

An always‑on, corner bubble that spawns delightful brainrot: a tiny agent UI with a menu and a YouTube Shorts player overlay. Click the bubble to open the menu, pick “YouTube Shorts,” paste a link, and watch without leaving the page. A small × closes the agent and any overlays.

## Features
- Floating agent bubble on every http/https page
- Click‑to‑open menu with “YouTube Shorts” option
- Lightweight Shorts/YouTube player overlay (paste URL, Enter/Play)
- Close button (×) to hide the agent and overlays
- Toolbar button and keyboard shortcut to toggle the agent
- No build step — pure Manifest V3 + vanilla JS/CSS

## Quick Start
1. Open Chrome → More tools → Extensions.
2. Enable “Developer mode”.
3. Click “Load unpacked” and select this folder.
4. Open any website (http/https).
5. Click the extension toolbar icon or press Alt+Shift+B to show the agent.

## Usage
- Open the menu: click the bubble.
- Start Shorts: click “YouTube Shorts”, paste a YouTube/Shorts URL, press Enter or click Play.
- Close the agent: click the × button on the bubble (removes agent + overlays).
- Toggle agent: toolbar icon or Alt+Shift+B.

Tip: The agent menu stays open after a click until you pick an option or click the bubble again.

## Keyboard & Commands
- Toggle agent: `Alt+Shift+B` (configurable in Chrome → Manage Extensions → Keyboard shortcuts)

## How It Works
- Service worker: `background.js` handles toolbar click and command. It sends `AB_TOGGLE_AGENT` to the active tab, and injects `content.js` on demand.
- Content script: `content.js` injects the agent iframe (`agent/agent.html`), listens for messages, opens the video overlay (`features/video/video.html`), and resizes/removes the agent on request.
- Agent UI: `agent/agent.html`, `agent/agent.css`, `agent/agent.js` render the bubble + menu and post messages:
  - `AB_OPEN { module: 'video' }` to open the Shorts overlay
  - `AB_AGENT_RESIZE` to expand/shrink the bubble area while menu is open
  - `AB_CLOSE_AGENT` to remove the agent and overlays
- Video overlay: `features/video/video.html` + `video.js` embed YouTube’s player and accept pasted URLs (Shorts and normal videos).

## Directory Layout
- `manifest.json` — MV3 config (permissions, service worker, command)
- `background.js` — toolbar/command → tab messaging + injection fallback
- `content.js` — injects agent, opens overlays, handles close/resize
- `agent/` — agent UI (bubble, menu, styles, logic)
- `features/video/` — Shorts/YouTube overlay UI and logic
- `common/ui.css` — shared UI styles
- `assets/agent_idle.svg` — idle face used by the agent

## Permissions (Why)
- `activeTab` — to message/inject into the current tab on demand
- `scripting` — to inject `content.js` if it isn’t present yet
- `storage` — to remember small preferences (e.g., last video URL/topic)

Host restrictions: Chrome blocks injection on `chrome://`, `edge://`, Web Store, and some internal pages. Use any regular http/https site.

## Troubleshooting
- Agent doesn’t appear:
  - Ensure the page is http/https (not a Chrome internal page)
  - Reload the extension in chrome://extensions and reload the tab
  - Check the DevTools Console for errors (page + service worker)
- Video doesn’t play:
  - Paste a valid `watch?v=`/`shorts/`/`youtu.be` URL
  - Some pages may restrict autoplay; click Play if prompted

## Customization
- Default “topic” seed is stored under `ab_default_topic` in `chrome.storage.local` (used when opening the video feature). You can set it manually via DevTools:
  ```js
  chrome.storage.local.set({ ab_default_topic: 'funny' })
  ```
- Shortcut can be changed in Chrome → Manage Extensions → Keyboard shortcuts.

## Packaging
No build step is required. To publish, create a ZIP of this folder (excluding `.git`, local temp files) and upload to the Chrome Web Store dashboard.

---
Made with vanilla MV3 for clarity and easy hacking. Have fun spawning brainrot! 😄
