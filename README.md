# 💬 Daavy's Chat

Improves the Foundry VTT chat log with tabs, message tools, and optional chat features.

---

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C1I7209LY1)

---

## ✨ Features

- **Chat tabs** — Separates Chat, Game, and Whispers.
- **Autocomplete** — Suggests users when typing `/w`, `/whisper`, or `@username`.
- **Message pins** — GMs can pin messages. Players can request pins for whispers.
- **Unread indicators** — Shows unread messages on inactive tabs. Mentions use a yellow indicator.
- **User mentions** — Type `@username` to mention a user. Mentioned text uses that user's color, plays a notification sound, and highlights the message with a yellow border for one minute. Mentions are local to each user.
- **Message merge** — Consecutive Chat and Whisper messages from the same author are displayed as a compact group. Game messages and pinned messages always remain separate.
- **Images in chat** — Paste or drag and drop images into chat. Supported formats are `PNG`, `JPG/JPEG`, `WEBP`, and `GIF`.
- **Chat clearing** — GMs can clear the active tab or clear all tabs with SHIFT.
- **Private roll protection** — Hides private rolls from users who cannot see them.

## ⚙️ Settings

### 🛠️ General

- **Cleaner Chat** — Hides avatars and usernames in chat headers.
- **Hide Chat Formatting** — Hides the ProseMirror formatting toolbar.
- **Collapsible Formula** — Hides dice formulas until clicked.
- **Hide Chat Initiative** — Prevents initiative roll messages from being created in chat.
- **Hide Private Messages** — Hides unauthorized private rolls.
- **Allow Player Media Uploads** — Allow or block player image uploads.

### 🎲 PF2e only

- **Hide Damage Buttons** — Hides damage buttons by default and adds a toggle for authorized users.
- **Hide Damage Traits** — Hides trait tags on damage rolls.
- **Trait Filter** — Filters low-impact traits and limits visible traits to three. Click the traits to expand them.

## 📦 Installation

In Foundry VTT, open **Add-on Modules**, choose **Install Module**, and enter the manifest URL:

<https://github.com/DaavyC/dchat/releases/latest/download/module.json>

## ✅ Compatibility

- **Foundry VTT:** Version 14
- **Systems:** System-agnostic, with optional PF2e features

## 📚 Credits

- **[Actually Private Messages](https://gitlab.com/koboldworks/agnostic/private-rolls)** by koboldworks — inspiration only.
- **[Autocomplete Whisper](https://github.com/orcnog/autocomplete-whisper/)** by orcnog — inspiration only.

> Built with AI-assisted development.
