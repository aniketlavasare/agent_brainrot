# 🧠 Agent Brainrot

<div align="center">

**Your AI-powered companion that lives in the corner of your browser**

A Chrome extension featuring an always-on agent that spawns delightful brainrot: YouTube Shorts feeds, AI-generated jokes, mini-games, and stress-relief fidgets—all without leaving your current page.

![Chrome](https://img.shields.io/badge/Chrome-MV3-blue?logo=googlechrome) 
![Version](https://img.shields.io/badge/version-1.1.0-green) 
![License](https://img.shields.io/badge/license-MIT-purple)
![No Build](https://img.shields.io/badge/build-none-orange)

</div>

---

## ✨ Features

### 🎬 **YouTube Shorts Feed**
- TikTok-style vertical scrolling video feed
- Personalized content based on custom keywords
- Swipe or arrow keys to navigate
- Auto-plays videos as you scroll
- Powered by YouTube Data API v3

### 🤣 **AI Jokes**
- Context-aware jokes generated from the current page content
- Powered by Google Gemini AI
- Text-to-speech voice delivery (optional)
- Smart personality system with dynamic facial expressions

### 🎮 **Mini-Games**
- **Tic-Tac-Toe**: Classic game vs AI opponent with witty taunts
- **Memory Match**: Card matching game to test your memory
- Quick entertainment without leaving your page

### 🎪 **Fidget Tools**
- **Bubble Pop**: Satisfying bubble-wrap popping experience
- **Fidget Spinner**: Drag-to-spin with realistic physics and inertia
- Optional sound effects for tactile feedback

### 🗣️ **Text-to-Speech Voice**
- Agent speaks using ElevenLabs TTS API
- Customizable voice and personality
- Greets you, tells jokes, and makes contextual remarks
- Toggle personality system on/off

### 🎭 **Dynamic Personality**
- Agent randomly changes facial expressions (idle, smile, grin, pout, sad)
- Makes contextual remarks about the page you're viewing
- Procedural sound effects for each emotion
- Smart face-locking during interactions

---

## 🚀 Quick Start

### Installation

1. **Clone or Download** this repository
2. Open **Chrome** → **⋮ More tools** → **Extensions**
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `agent_brainrot` folder
5. Pin the extension to your toolbar for easy access

### First Launch

1. Click the Agent Brainrot icon in your toolbar
2. Toggle the agent ON (or press `Alt+Shift+B`)
3. A friendly bubble appears in the bottom-right corner! 👋
4. Click the bubble to open the menu and explore features

---

## ⚙️ Configuration

Click the Agent Brainrot toolbar icon to access settings:

### 🔑 API Keys (Optional but Recommended)

| Service | Purpose | Get Your Key |
|---------|---------|--------------|
| **YouTube Data API v3** | Power the Shorts feed with real videos | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **Google Gemini API** | Generate contextual jokes | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **ElevenLabs API** | Text-to-speech voice (optional) | [ElevenLabs](https://elevenlabs.io) |

> **Note**: The extension works without API keys! It uses fallback videos for the Shorts feed and disables AI features gracefully.

### 📺 Video Feed Settings

- **Keywords**: Comma-separated topics for personalized content (e.g., `cats, gaming, cooking`)
- **Shorts Only**: Toggle to allow regular YouTube videos or restrict to Shorts only

### 🎤 Voice Settings

- **ElevenLabs Voice ID**: Customize the agent's voice (find voice IDs in your ElevenLabs dashboard)
- **Personality Toggle**: Enable/disable AI remarks and voice

---

## 🎯 Usage

### Basic Controls

- **Toggle Agent**: Click toolbar icon or press `Alt+Shift+B`
- **Open Menu**: Click the agent bubble
- **Close Agent**: Click the `×` button on the bubble

### Features

#### YouTube Shorts
1. Click bubble → **YouTube Shorts**
2. Swipe or use `↑`/`↓` arrow keys to navigate
3. Press `Esc` to close the overlay

#### Jokes
1. Click bubble → **Jokes**
2. Agent analyzes the current page and generates a contextual joke
3. Listens to the joke via text-to-speech (if enabled)

#### Games
1. Click bubble → **Games**
2. Select **Tic-Tac-Toe** or **Memory Match** from the dropdown
3. Play and have fun! The agent reacts to your wins/losses

#### Fidget Tools
1. Click bubble → **Fidgit**
2. Choose **Bubble Pop** or **Spinner**
3. Optional: Enable sound effects with the sound button

---

## 🏗️ Technical Architecture

### Project Structure

```
agent_brainrot/
├── manifest.json              # Chrome MV3 configuration
├── background.js              # Service worker (toolbar, commands)
├── content.js                 # Main content script (injects agent)
├── popup.html/js              # Extension settings popup
├── agent/
│   ├── agent.html             # Agent bubble UI
│   ├── agent.js               # Menu logic, personality system
│   └── agent.css              # Agent styles
├── features/
│   ├── video/                 # YouTube Shorts feed
│   ├── jokes/                 # AI joke generator
│   ├── games/                 # Mini-games (tictactoe, match)
│   ├── fidgit/                # Stress-relief tools
│   └── tts/                   # ElevenLabs TTS integration
├── assets/                    # SVG faces and icons
└── common/                    # Shared styles
```

### How It Works

1. **Service Worker** (`background.js`): Listens for toolbar clicks and keyboard commands, sends messages to active tabs
2. **Content Script** (`content.js`): Injects the agent iframe into web pages, manages overlays
3. **Agent UI** (`agent/`): Renders the bubble, menu, and handles feature launches
4. **Feature Modules** (`features/`): Self-contained overlays for video, jokes, games, fidgit
5. **Cross-Frame Messaging**: All components communicate via `postMessage` API

### Key Technologies

- **Vanilla JavaScript** (no frameworks)
- **Chrome Manifest V3**
- **Web Audio API** (procedural sound effects)
- **YouTube iframe API** (video player)
- **Google Gemini API** (AI jokes)
- **ElevenLabs API** (text-to-speech)

---

## 🔐 Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `activeTab` | To inject the agent into the current tab on demand |
| `scripting` | To dynamically inject the content script if not present |
| `storage` | To save API keys, preferences, and keywords |
| `host_permissions` | To function on all http/https websites |

> **Privacy**: All data stays local. API keys are stored in `chrome.storage.local` and never leave your browser except to call the respective APIs (YouTube, Gemini, ElevenLabs).

### Restricted Pages

Chrome blocks extensions on internal pages:
- `chrome://`, `edge://`, `about://`
- Chrome Web Store
- New Tab page (by default)

The agent works on all regular websites (`http://` and `https://`).

---

## 🛠️ Troubleshooting

### Agent Doesn't Appear

1. **Check the page**: Ensure you're on a regular website (not `chrome://`)
2. **Reload**: Refresh the page after installing/updating the extension
3. **Re-inject**: Go to `chrome://extensions` and reload the extension
4. **Console**: Check DevTools Console (F12) for errors

### Videos Don't Load

1. **API Key**: Ensure you've added a YouTube Data API v3 key in settings
2. **Fallback**: Without an API key, the extension uses 3 fallback videos
3. **Autoplay**: Some sites block autoplay; click the video to start

### Jokes Don't Work

1. **API Key**: Add a Google Gemini API key in the settings popup
2. **Quota**: Check your API quota in Google Cloud Console
3. **Error Message**: Agent will pout and show "Couldn't fetch a joke"

### Voice Doesn't Work

1. **API Key**: Add ElevenLabs API key and voice ID in settings
2. **Personality**: Ensure personality is enabled in settings
3. **User Gesture**: First TTS call requires a user interaction (click toggle)

### Keyboard Shortcut Conflict

1. Go to `chrome://extensions/shortcuts`
2. Find "Agent Brainrot"
3. Change the keyboard shortcut from `Alt+Shift+B` to your preference

---

## 🎨 Customization

### Change Default Topic

Set a default topic for the YouTube Shorts feed:

```javascript
// Open DevTools Console (F12) on any page
chrome.storage.local.set({ ab_default_topic: 'funny cats' })
```

### Customize Keywords

Add your interests in the settings popup (comma-separated):

```
gaming, technology, cooking, travel, music
```

The agent will search for videos matching these topics!

### Disable Personality

Toggle off "Personality & Voice" in settings to stop the agent from:
- Making random remarks
- Speaking out loud
- Changing facial expressions automatically

It will still respond to your menu interactions.

---

## 📦 Packaging for Distribution

### Create ZIP for Chrome Web Store

```bash
# Exclude development files
zip -r agent_brainrot.zip . -x "*.git*" "*node_modules*" "*.DS_Store" "*.txt"
```

### Publish

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Upload `agent_brainrot.zip`
4. Fill in store listing details
5. Submit for review

---

## 🧪 Development

### No Build Step Required

This extension uses vanilla JS/CSS with no build tools. Just edit and reload!

### Live Development

1. Make changes to any file
2. Go to `chrome://extensions`
3. Click the reload icon on Agent Brainrot
4. Refresh the test page to see changes

### Adding New Features

1. Create a new folder in `features/` (e.g., `features/myfeature/`)
2. Add `myfeature.html`, `myfeature.js`, `myfeature.css`
3. Register resources in `manifest.json` → `web_accessible_resources`
4. Add menu button in `agent/agent.html`
5. Handle the module launch in `agent/agent.js`

### Testing

- Test on various websites (http/https)
- Check restricted pages behavior
- Test keyboard shortcuts
- Verify API integrations with valid keys
- Test without API keys (fallback behavior)

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for Contributions

- [ ] Add more mini-games (Snake, 2048, etc.)
- [ ] Support more video platforms (Vimeo, Twitch clips)
- [ ] Add more AI features (chat, image generation)
- [ ] Improve accessibility (screen reader support)
- [ ] Add themes/skins for the agent
- [ ] Internationalization (i18n)

---

## 📄 License

MIT License - feel free to use, modify, and distribute!

---

## 🙏 Credits

- **YouTube Data API** for video content
- **Google Gemini** for AI-powered jokes
- **ElevenLabs** for realistic text-to-speech
- **Web Audio API** for procedural sound effects
- Built with ❤️ using vanilla JS and Chrome MV3

---

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/agent_brainrot/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/agent_brainrot/discussions)
- 📧 **Email**: your.email@example.com

---

<div align="center">

**Made with vanilla MV3 for clarity and easy hacking.**

**Have fun spawning brainrot! 🧠✨**

</div>
