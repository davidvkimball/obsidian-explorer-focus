import { App, PluginSettingTab, Setting } from "obsidian";
import { SimpleFocusPlugin } from "../main";

export class SimpleFocusSettingTab extends PluginSettingTab {
	plugin: SimpleFocusPlugin;

	constructor(app: App, plugin: SimpleFocusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(this.plugin.lang.showRightClickMenu)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRightClickMenu)
				.onChange(async (value) => {
					this.plugin.settings.showRightClickMenu = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.plugin.lang.showFileExplorerIcon)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFileExplorerIcon)
				.onChange(async (value) => {
					this.plugin.settings.showFileExplorerIcon = value;
					await this.plugin.saveSettings();
					this.plugin.updateFileExplorerIcon();
				}));

		const focusLevelSetting = new Setting(containerEl)
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
					this.display(); // Refresh to show/hide custom folder input
				}));

		// Add custom folder path input that only shows when custom is selected
		if (this.plugin.settings.focusLevel === 'custom') {
			new Setting(containerEl)
				.setName(this.plugin.lang.customFolderPath)
				.setDesc(this.plugin.lang.customFolderPathDesc)
				.addText(text => text
					.setPlaceholder('folder/subfolder')
					.setValue(this.plugin.settings.customFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.customFolderPath = value;
						await this.plugin.saveSettings();
					}));
		}
	}
}

