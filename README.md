# Explorer Focus

Focus on a specific file or folder in the file explorer.

## Features

Explorer Focus allows you to reduce visual clutter in the file explorer by focusing on specific files or folders. When in focus mode, only the focused item and its related files (children, ancestors) are visible.

### Focus Modes

- **Current file only**: Focus on just the currently open file
- **Parent folder**: Focus on the parent folder of the current file
- **Grandparent folder**: Focus on the grandparent folder (two levels up)
- **Great grandparent folder**: Focus on the great grandparent folder (three levels up)
- **Custom folder**: Focus on a specific folder path regardless of the current file

### Interface Options

- **Right-click menu integration**: Right-click any file or folder to quickly focus on it
- **File explorer icon button**: Add a focus toggle button directly in the file explorer navigation bar
- **Hide ancestor folders**: Option to hide parent folder indentation when focusing, making the focused folder appear at root level

## Commands

- `Explorer Focus: Toggle focus` - Toggle focus mode on/off based on the configured focus level

The toggle command uses the focus level setting to determine what to focus on. The right-click menu always focuses the clicked file or folder directly.

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/explorer-focus/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Using BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repository to BRAT
3. Enable the plugin in Settings → Community plugins

### Development

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start compilation in watch mode
4. The plugin will be compiled to `main.js`

## Usage

1. Open Settings → Explorer Focus
2. Configure your preferred focus level (file, parent, grandparent, great grandparent, or custom folder)
3. Enable the right-click menu option to quickly focus from the context menu
4. Enable the file explorer icon to add a toggle button in the file explorer
5. Use the toggle command or right-click menu to enter focus mode
6. Click the focus icon again or use the toggle command to exit focus mode

### Focus Behavior

When you focus on a file or folder:
- The focused item is always visible
- All children (files and folders inside) are visible
- All ancestors (parent folders up to root) are visible
- All other files and folders are hidden

This creates a focused view that shows only what's relevant to your current work.

## Compatibility

- Works on both desktop and mobile
- Compatible with Obsidian 0.15.0 and later

## Development

This project uses TypeScript and follows Obsidian plugin best practices.

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Credits

- Based on [Simple Focus](https://github.com/linqing24/obsidian-simple-focus) by linqing24
- Settings UI patterns inspired by [UI Tweaker](https://github.com/kepano/obsidian-ui-tweaker)
