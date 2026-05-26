# 💬 Daavy's Chat

A lightweight chat enhancement module for **Foundry VTT**. It splits chat into separate tabs and adds optional features that reduce noise and improve readability.

---

## 🗂️ Core Features

- **📑 Tabbed Interface** — Separates chat into **Chat**, **Game** (rolls and actions), and **Whispers**.
- **🧠 Smart Classification** — Routes system messages, action cards, and dice rolls to the **Game** tab.
- **🔔 Notification Pips** — Marks inactive tabs when new messages arrive.
- **🧹 Scoped Clear** — Clears the active tab by default, or every tab with **SHIFT + click**.

---

## ✨ Modular Enhancements

Each feature can be enabled or disabled in the module settings.

- **👤 Cleaner Chat** — Hides user avatars and names to reduce vertical space.
- **📏 Compact Chat** — Uses a tighter chat layout.
- **📉 Collapsible Formula** — Hides roll formulas behind a clickable header.
- **🤫 Autocomplete Whisper** — Adds inline recipient autocomplete for `/w` and `/whisper`, including multi-recipient selection.
- **🙈 Hide Private Messages** — Hides private rolls from users who should not see them.
- **⏱️ Hide Chat Initiative** — Prevents initiative roll messages from being created in chat.
- **🛡️ Hide Damage Traits (PF2e)** — Removes damage trait tags from PF2e damage rolls.
- **🏷️ Trait Filter (PF2e)** — Hides low-value PF2e traits and limits the visible trait list to three entries until expanded.
- **👁️ Hide Damage Buttons (PF2e)** — Hides PF2e damage buttons by default.

---

## ⚙️ Settings

The settings UI is organized into **Settings** and **PF2e Only** groups.

- Most features are **client-scoped**.
- **Hide Private Messages** and **Hide Chat Initiative** are **world-scoped** and **GM only**.

---

## 🛠️ Compatibility

- **Foundry VTT**: Version 14.
- **Systems**: System-agnostic for tabs and general features, with PF2e-specific enhancements where noted.

---

## 📚 Credits

- **[Actually Private Messages](https://gitlab.com/koboldworks/agnostic/private-rolls)** by koboldworks — inspiration only.
- **[Autocomplete Whisper](https://github.com/orcnog/autocomplete-whisper/)** by orcnog — inspiration only.

---

> This module was built for personal use with AI-assisted development.
