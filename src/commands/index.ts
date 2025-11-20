import { Plugin } from "obsidian";
import { SimpleFocusPlugin } from "../main";
import { getFocusPath } from "../utils/focus";

export function registerCommands(plugin: SimpleFocusPlugin): void {
	// Toggle focus command
	plugin.addCommand({
		id: "simple-focus-toggle",
		name: plugin.lang.toggleFocus,
		callback: () => {
			if (plugin.isFocus) {
				plugin.exitFocus();
			} else {
				if (plugin.settings.focusLevel === 'custom') {
					// For custom folder, use the custom path directly
					if (plugin.settings.customFolderPath) {
						plugin.enterFocus(plugin.settings.customFolderPath);
					}
				} else {
					// For other levels, need the current file
					const file = plugin.app.workspace.getActiveFile();
					if (file?.path) {
						const focusPath = getFocusPath(file.path, plugin.settings.focusLevel, plugin.settings);
						plugin.enterFocus(focusPath);
					}
				}
			}
		},
	});

	// File menu item
	if (plugin.settings.showRightClickMenu) {
		plugin.registerEvent(
			plugin.app.workspace.on("file-menu", (menu, file) => {
				if (!plugin.settings.showRightClickMenu) {
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle(plugin.isFocus ? plugin.lang.exitFocus : plugin.lang.focus)
						.setIcon(plugin.isFocus ? "log-out" : "focus")
						.onClick(async () => {
							plugin.toggleFocus(file?.path);
						});
				});
			})
		);
	}
}

