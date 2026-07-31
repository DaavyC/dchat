##### 1.7.0
- Added support for mentioning users with `@username`.
  - Mentioned users receive a sound notification, and the tab ping turns yellow.
  - The message remains highlighted for one minute after the user opens the tab.
  - This feature only applies to the Chat and Whisper tabs.
- Removed the option to disable `Autocomplete Whisper`.
- Removed the legacy `Compact Chat` feature because it had no noticeable visual effect.
- Changed the ping color to white so it is not overridden by themes from other modules.

##### 1.6.3
- Changed the Whisper tab icon to a more intuitive design.
- Added a sound notification for incoming Whisper messages.
- Sending a message while the Whisper tab is open now replies to the last user who sent you a Whisper.
- Certain chat actions now switch tabs automatically:
  - Sending a message switches to the Chat tab.
  - Making a roll switches to the Game tab.
  - Sending a Whisper switches to the Whisper tab.
- Your current Whisper reply target is now displayed next to the Whisper tab.
- Sending `/w user` without a message now changes your current Whisper reply target without sending anything.
- Improved `Autocomplete Whisper` behavior when holding Shift.

##### 1.6.2
- Improved the Settings interface.

##### 1.6.1
- Removed debug mode.
- Added an anonymous feedback button for GMs only.

##### 1.6.0
- Added Chat Pins.
  - Players can now request message pins from GMs through the Whisper tab.
  - Added a Pin Manager button for managing pins across all tabs.

##### 1.5.1
- Removed the option to reset settings.

##### 1.5.0
- Added Hide Chat Formatting, which removes ProseMirror formatting from chat.
- Reorganized the Settings menu.

##### 1.4.5
- Added an option to restore the default settings.
- Debug mode can now be enabled or disabled instead of always being active.

##### 1.0.1 - 1.4.4
- Fixed bugs.
- Added Autocomplete Whisper, Hide Private Messages, and Hide Chat Initiative as optional features.

##### 1.0.0
- Initial release.