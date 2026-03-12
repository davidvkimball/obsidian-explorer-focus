import { App, PluginSettingTab, SettingGroup } from "obsidian";
import { ExplorerFocusPlugin } from "../main";
import { getAllFileExplorers } from "../utils/file-explorer-patch";
import { FolderSuggest } from "./folder-suggest";


export class ExplorerFocusSettingTab extends PluginSettingTab {
	plugin: ExplorerFocusPlugin;
	public icon = 'lucide-focus';

	constructor(app: App, plugin: ExplorerFocusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// First group (no heading)
		const generalGroup = new SettingGroup(containerEl);

		generalGroup.addSetting(setting => {
			setting
				.setName("Show right-click menu option")
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showRightClickMenu)
					.onChange(async value => {
						this.plugin.settings.showRightClickMenu = value;
						await this.plugin.saveSettings();
					}));
		});

		generalGroup.addSetting(setting => {
			setting
				.setName("Show file explorer icon")
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showFileExplorerIcon)
					.onChange(async value => {
						this.plugin.settings.showFileExplorerIcon = value;
						await this.plugin.saveSettings();
						this.plugin.updateFileExplorerIcon();
					}));
		});

		generalGroup.addSetting(setting => {
			setting
				.setName("Command focus level")
				.setDesc("Determines what to focus when using the toggle command or file explorer icon. Right-click menu always focuses the clicked file/folder.")
				.addDropdown(dropdown => dropdown
					.addOption('file', "Current file only")
					.addOption('parent', "Parent folder")
					.addOption('grandparent', "Grandparent folder")
					.addOption('greatgrandparent', "Great grandparent folder")
					.addOption('custom', "Specific folder")
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
			generalGroup.addSetting(setting => {
				setting
					.setName("Custom folder path")
					.setDesc("Enter a folder path (folder/subfolder). This folder will be focused regardless of which file is open.")
					.addText(text => {
						new FolderSuggest(this.app, text.inputEl);
						text
							.setPlaceholder('Folder/subfolder')
							.setValue(this.plugin.settings.customFolderPath)
							.onChange(async value => {
								this.plugin.settings.customFolderPath = value;
								await this.plugin.saveSettings();
							});
					});
			});
		}

		// Auto-hide folders section
		const autoHideGroup = new SettingGroup(containerEl)
			.setHeading("Auto-hide folders");

		autoHideGroup.addSetting(setting => {
			setting
				.setName("Hidden folders")
				.setDesc("These folders are always hidden from the file explorer. Useful for hiding build artifacts like node_modules or dist.");
		});

		const autoHidePaths = this.plugin.settings.autoHidePaths ?? [];

		autoHidePaths.forEach((path, index) => {
			autoHideGroup.addSetting(setting => {
				setting
					.addText(text => {
						new FolderSuggest(this.app, text.inputEl);
						text
							.setValue(path)
							.setPlaceholder("Folder name")
							.onChange(async value => {
								this.plugin.settings.autoHidePaths[index] = value;
								await this.plugin.saveSettings();
								this.plugin.updateAutoHideStyles();
							});
					})
					.addExtraButton(button => button
						.setIcon("trash-2")
						.setTooltip("Remove")
						.onClick(async () => {
							this.plugin.settings.autoHidePaths.splice(index, 1);
							await this.plugin.saveSettings();
							this.plugin.updateAutoHideStyles();
							this.display();
						}));
			});
		});

		autoHideGroup.addSetting(setting => {
			setting
				.addButton(button => button
					.setButtonText("Add folder")
					.onClick(async () => {
						if (!this.plugin.settings.autoHidePaths) {
							this.plugin.settings.autoHidePaths = [];
						}
						this.plugin.settings.autoHidePaths.push("");
						await this.plugin.saveSettings();
						this.display();
					}));
		});

	}
}

