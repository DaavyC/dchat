# Daavy's Chat

Adds tabs and message tools to the Foundry VTT chat log.

---

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C1I7209LY1)

---

## Features

- Tabs separate Chat, Game, and Whispers.
- Autocomplete suggests users when you type `/w`, `/whisper`, or `@username`.
- GMs can pin messages. Players can request pins for whispers.
- Type `@username` to mention a user. The text uses that user's color. The mentioned user hears a notification sound and sees a yellow border around the message for one minute after opening its tab. Each user sees their own mention alerts.
- Consecutive messages from the same author appear in a compact group within Chat or Whispers. Game messages and pinned messages remain separate.
- Paste or drag and drop images into chat. Supported formats are PNG, JPG/JPEG, WEBP, and GIF.
- Private roll protection hides rolls from users who cannot see their content.

## Settings

### General

| Setting | Effect |
| --- | --- |
| Cleaner chat | Hides avatars and usernames in chat headers. |
| Hide formatting toolbar | Hides the ProseMirror formatting toolbar. |
| Collapsible formula | Hides dice formulas until you click them. |
| Hide initiative messages | Prevents initiative rolls from creating chat messages. |
| Hide private rolls | Hides private rolls from users who cannot see their content. |
| Allow player media uploads | Allows or blocks player image uploads. |

### PF2e only

| Setting | Effect |
| --- | --- |
| Hide damage buttons | Hides damage buttons by default and adds a toggle for users who can use them. |
| Hide damage traits | Hides trait tags on damage rolls. |
| Trait filter | Hides low-impact traits and shows up to three traits. Click the traits to expand them. |

## Installation

In Foundry VTT, open Add-on Modules, choose Install Module, and enter the manifest URL:

<https://github.com/DaavyC/dchat/releases/latest/download/module.json>

## Compatibility

- Requires Foundry VTT 14.
- Works with any game system. Some settings are specific to PF2e.

## Credits

- [Actually Private Messages](https://gitlab.com/koboldworks/agnostic/private-rolls) by koboldworks — feature inspiration.
- [Autocomplete Whisper](https://github.com/orcnog/autocomplete-whisper/) by orcnog — feature inspiration.
