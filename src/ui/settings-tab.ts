import { App, PluginSettingTab } from "obsidian";
import { ExplorerFocusPlugin } from "../main";
import { getAllFileExplorers } from "../utils/file-explorer-patch";
import { createSettingsGroup } from "../utils/settings-compat";

export class ExplorerFocusSettingTab extends PluginSettingTab {
	plugin: ExplorerFocusPlugin;

	constructor(app: App, plugin: ExplorerFocusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// First group (no heading)
		const generalGroup = createSettingsGroup(containerEl);

		generalGroup.addSetting((setting) => {
			setting
				.setName(this.plugin.lang.showRightClickMenu)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showRightClickMenu)
					.onChange(async (value) => {
						this.plugin.settings.showRightClickMenu = value;
						await this.plugin.saveSettings();
					}));
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName(this.plugin.lang.showFileExplorerIcon)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showFileExplorerIcon)
					.onChange(async (value) => {
						this.plugin.settings.showFileExplorerIcon = value;
						await this.plugin.saveSettings();
						this.plugin.updateFileExplorerIcon();
					}));
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName(this.plugin.lang.focusLevel)
				.setDesc(this.plugin.lang.focusLevelDesc)
				.addDropdown(dropdown => dropdown
					.addOption('file', this.plugin.lang.focusLevelFile)
					.addOption('parent', this.plugin.lang.focusLevelParent)
					.addOption('grandparent', this.plugin.lang.focusLevelGrandparent)
					.addOption('greatgrandparent', this.plugin.lang.focusLevelGreatGrandparent)
					.addOption('custom', this.plugin.lang.focusLevelCustom)
					.setValue(this.plugin.settings.focusLevel)
					.onChange(async (value: string) => {
						this.plugin.settings.focusLevel = value as 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom';
						await this.plugin.saveSettings();
						// Refresh file explorer if in focus mode
						if (this.plugin.isFocus) {
							const fileExplorers = getAllFileExplorers(this.plugin);
							fileExplorers.forEach((fileExplorer) => {
								if (fileExplorer?.requestSort) {
									fileExplorer.requestSort();
								}
							});
						}
						this.display(); // Refresh to show/hide custom folder input
					}));
		});

		// Add custom folder path input that only shows when custom is selected
		if (this.plugin.settings.focusLevel === 'custom') {
			generalGroup.addSetting((setting) => {
				setting
					.setName(this.plugin.lang.customFolderPath)
					.setDesc(this.plugin.lang.customFolderPathDesc)
					.addText(text => text
						.setPlaceholder('Folder/subfolder')
						.setValue(this.plugin.settings.customFolderPath)
						.onChange(async (value) => {
							this.plugin.settings.customFolderPath = value;
							await this.plugin.saveSettings();
						}));
			});
		}

	}
}

