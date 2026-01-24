---
name: project
description: Project-specific architecture, maintenance tasks, and unique conventions for Explorer Focus.
---

# Explorer Focus Project Skill

Focus on a specific file or folder in the file explorer. This plugin improves navigation within the file tree by providing commands to "focus" (highlight and expand) the current active file's location.

## Core Architecture

- **File Explorer Interaction**: Directly interacts with the `file-explorer` view and its internal DOM tree.
- **i18n Support**: Includes a `lang/` directory for internationalization of commands and notices.
- **Selection Logic**: Logic to calculate the correct node in the file tree and ensure it is visible to the user.

## Project-Specific Conventions

- **Focus Commands**: Primary entry points are Obsidian commands (registered in `main.ts`).
- **Translation-First**: All user-facing strings should be localized using the `lang/` system.
- **UI Responsiveness**: Focus operations should trigger immediate scrolling/expansion in the sidebar.

## Key Files

- `src/main.ts`: Command registration and core navigation logic.
- `lang/`: JSON files containing localized strings for different languages.
- `manifest.json`: Configuration and plugin id (`explorer-focus`).
- `esbuild.config.mjs`: Build script (handles translation files if necessary).

## Maintenance Tasks

- **i18n Audit**: Check for missing translations when adding new commands/notices.
- **sidebar DOM**: The file explorer is a highly dynamic component; audit selectors after Obsidian updates.
- **Mobile Sidebar**: Verify focus behavior on mobile where the sidebar is often hidden.
