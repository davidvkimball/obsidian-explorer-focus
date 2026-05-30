import { App, PluginSettingTab, Setting, SettingGroup } from "obsidian";
import { ExplorerFocusPlugin } from "../main";
import { getAllFileExplorers } from "../utils/file-explorer-patch";
import { FolderSuggest } from "./folder-suggest";
import { AutoHideModal } from "./auto-hide-modal";


export class ExplorerFocusSettingTab extends PluginSettingTab {
	plugin: ExplorerFocusPlugin;
	public icon = 'lucide-focus';

	constructor(app: App, plugin: ExplorerFocusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// 1.13.0+: framework calls this and skips display().
	// Pre-1.13.0: this method is not invoked; display() below runs as before.
	// See https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
	getSettingDefinitions() {
		return [
			{
				name: 'Show right-click menu option',
				control: { type: 'toggle' as const, key: 'showRightClickMenu' },
			},
			{
				name: 'Show file explorer icon',
				// Render: changing this value has a side effect (file explorer icon update).
				render: (setting: Setting) => {
					setting.addToggle(toggle => toggle
						.setValue(this.plugin.settings.showFileExplorerIcon)
						.onChange(async value => {
							this.plugin.settings.showFileExplorerIcon = value;
							await this.plugin.saveSettings();
							this.plugin.updateFileExplorerIcon();
						}));
				},
			},
			{
				name: 'Command focus level',
				desc: 'Determines what to focus when using the toggle command or file explorer icon. Right-click menu always focuses the clicked file/folder.',
				// Render: changing this value refreshes the file explorer and shows or hides
				// the custom folder path row below, so refresh the DOM state to re-evaluate
				// that row's visible predicate.
				render: (setting: Setting) => {
					setting.addDropdown(dropdown => dropdown
						.addOption('file', 'Current file only')
						.addOption('parent', 'Parent folder')
						.addOption('grandparent', 'Grandparent folder')
						.addOption('greatgrandparent', 'Great grandparent folder')
						.addOption('custom', 'Specific folder')
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
							// Re-run the visible predicate so the custom folder path row appears
							// or disappears. refreshDomState exists on Obsidian 1.13.0+, which is
							// the only version that calls getSettingDefinitions in the first place.
							const refresh = (this as unknown as { refreshDomState?: () => void }).refreshDomState;
							if (refresh) refresh.call(this);
						}));
				},
			},
			{
				name: 'Custom folder path',
				desc: 'Enter a folder path (folder/subfolder). This folder will be focused regardless of which file is open.',
				// Shown only when the command focus level is set to a specific folder.
				visible: () => this.plugin.settings.focusLevel === 'custom',
				// Render: uses a folder suggester custom control.
				render: (setting: Setting) => {
					setting.addText(text => {
						new FolderSuggest(this.app, text.inputEl);
						text
							.setPlaceholder('Folder/subfolder')
							.setValue(this.plugin.settings.customFolderPath)
							.onChange(async value => {
								this.plugin.settings.customFolderPath = value;
								await this.plugin.saveSettings();
							});
					});
				},
			},
			{
				type: 'group' as const,
				heading: 'Auto-hide folders',
				items: [
					{
						name: 'Hidden folders',
						// Render: builds a dynamic description listing the hidden folders and an
						// action button that opens the manage modal.
						render: (setting: Setting) => {
							const autoHidePaths = (this.plugin.settings.autoHidePaths ?? []).filter(p => p.trim().length > 0);

							const descFragment = activeDocument.createDocumentFragment();
							descFragment.appendText('These folders are always hidden from the file explorer.');

							if (autoHidePaths.length > 0) {
								const list = descFragment.createEl('ul');
								autoHidePaths.forEach(p => {
									list.createEl('li', { text: p });
								});
							}

							setting
								.setDesc(descFragment)
								.addButton(button => button
									.setButtonText('Manage')
									.onClick(() => {
										new AutoHideModal(this.app, this.plugin, () => {
											// Managing folders changes the set of rendered description
											// items, so rebuild from getSettingDefinitions. update exists
											// on Obsidian 1.13.0+, which is the only version that calls
											// getSettingDefinitions in the first place.
											const update = (this as unknown as { update?: () => void }).update;
											if (update) update.call(this);
										}).open();
									}));
						},
					},
				],
			},
		];
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
			const autoHidePaths = (this.plugin.settings.autoHidePaths ?? []).filter(p => p.trim().length > 0);

			const descFragment = activeDocument.createDocumentFragment();
			descFragment.appendText("These folders are always hidden from the file explorer.");

			if (autoHidePaths.length > 0) {
				const list = descFragment.createEl("ul");
				autoHidePaths.forEach(p => {
					list.createEl("li", { text: p });
				});
			}

			setting
				.setName("Hidden folders")
				.setDesc(descFragment)
				.addButton(button => button
					.setButtonText("Manage")
					.onClick(() => {
						new AutoHideModal(this.app, this.plugin, () => {
							this.display();
						}).open();
					}));
		});

	}
}

