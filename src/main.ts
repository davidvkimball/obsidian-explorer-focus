import { App, Plugin, PluginManifest } from "obsidian";
import langs, { Lang } from '../lang';
import { SimpleFocusSettings, DEFAULT_SETTINGS } from './types';
import { SimpleFocusSettingTab } from './ui/settings-tab';
import { registerCommands } from './commands';
import { createFileExplorerIcon, insertFileExplorerIcon } from './utils/file-explorer';
import { patchFileExplorer as patchFileExplorerUtil, getFileExplorer as getFileExplorerUtil, getAllFileExplorers, FileExplorerView } from './utils/file-explorer-patch';
import { getFocusPath } from './utils/focus';

export class SimpleFocusPlugin extends Plugin {
	isFocus: boolean;
	focusedPath: string | null;
	lang: Lang;
	settings!: SimpleFocusSettings;
	fileExplorerIcon: HTMLElement | null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		const obsidianLangName = window.localStorage.getItem('language');
		const langName = obsidianLangName === 'zh' ? 'zh' : 'en';
		this.lang = langs[langName];
		this.isFocus = false;
		this.focusedPath = null;
		this.fileExplorerIcon = null;
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SimpleFocusSettingTab(this.app, this));

		registerCommands(this);

		if (this.settings.showFileExplorerIcon) {
			this.addFileExplorerIcon();
		}

		this.app.workspace.onLayoutReady(() => {
			this.patchAllFileExplorers();
			this.updateFocusModeClasses();
		});

		this.app.workspace.on("layout-change", () => {
			this.patchAllFileExplorers();
			this.updateFocusModeClasses();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	toggleFocus(path: string | undefined) {
		if (this.isFocus) {
			this.exitFocus();
		} else if (path) {
			this.enterFocus(path);
		}
	}

	enterFocus(path: string) {
		this.isFocus = true;
		this.focusedPath = path;
		
		// Update icon if it exists
		this.updateFileExplorerIcon();
		
		// Update CSS classes
		this.updateFocusModeClasses();
		
		// Trigger file explorer refresh on all file explorer instances
		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			if (fileExplorer?.requestSort) {
				fileExplorer.requestSort();
			}
		});
	}

	patchAllFileExplorers(): void {
		// Patch the prototype (once) and mark all instances
		patchFileExplorerUtil(this);
		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			fileExplorer.fileExplorerPlusPatched = true;
		});
	}

	exitFocus() {
		this.isFocus = false;
		this.focusedPath = null;

		// Update icon if it exists
		this.updateFileExplorerIcon();
		
		// Update CSS classes
		this.updateFocusModeClasses();
		
		// Trigger file explorer refresh on all file explorer instances
		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			if (fileExplorer?.requestSort) {
				fileExplorer.requestSort();
			}
		});
	}

	updateFocusModeClasses(): void {
		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			const containerEl = fileExplorer.containerEl;
			if (this.isFocus) {
				containerEl.addClass("simple-focus-mode");
			} else {
				containerEl.removeClass("simple-focus-mode");
			}
		});
	}


	addFileExplorerIcon() {
		const addIconToFileExplorer = () => {
			const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
			if (fileExplorerLeaves.length === 0) {
				return;
			}

			const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
			const navButtonsContainer = fileExplorerView.querySelector('.nav-buttons-container') as HTMLElement;
			
			if (!navButtonsContainer) {
				return;
			}

			// Check if icon already exists
			if (this.fileExplorerIcon && navButtonsContainer.contains(this.fileExplorerIcon)) {
				return;
			}

			// Remove old icon if it exists elsewhere
			if (this.fileExplorerIcon) {
				this.fileExplorerIcon.remove();
			}

			// Create the icon button if it doesn't exist
			if (!this.fileExplorerIcon) {
				this.fileExplorerIcon = createFileExplorerIcon(this);

				// Register click handler using registerDomEvent for proper cleanup
				this.registerDomEvent(this.fileExplorerIcon, 'click', () => {
					if (this.isFocus) {
						this.exitFocus();
					} else {
						if (this.settings.focusLevel === 'custom') {
							// For custom folder, use the custom path directly
							if (this.settings.customFolderPath) {
								this.enterFocus(this.settings.customFolderPath);
							}
						} else {
							// For other levels, need the current file
							const file = this.app.workspace.getActiveFile();
							if (file?.path) {
								const focusPath = getFocusPath(file.path, this.settings.focusLevel, this.settings);
								this.enterFocus(focusPath);
							}
						}
					}
				});
			}
			
			// Set/update icon
			this.updateFileExplorerIcon();

			// Insert icon in correct position
			insertFileExplorerIcon(this.fileExplorerIcon, navButtonsContainer);
		};

		// Try to add immediately
		addIconToFileExplorer();

		// Also listen for workspace changes in case file explorer is created later
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (this.settings.showFileExplorerIcon) {
					addIconToFileExplorer();
				}
			})
		);
	}

	updateFileExplorerIcon() {
		if (!this.fileExplorerIcon) {
			return;
		}

		if (!this.settings.showFileExplorerIcon) {
			if (this.fileExplorerIcon.parentElement) {
				this.fileExplorerIcon.remove();
			}
			return;
		}

		// Ensure icon is in DOM if setting is enabled
		if (!this.fileExplorerIcon.parentElement) {
			// Re-insert the icon into the file explorer
			const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
			if (fileExplorerLeaves.length > 0) {
				const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
				const navButtonsContainer = fileExplorerView.querySelector('.nav-buttons-container') as HTMLElement;
				
				if (navButtonsContainer) {
					insertFileExplorerIcon(this.fileExplorerIcon, navButtonsContainer);
				}
			}
		}

		// Toggle is-active class based on focus state
		if (this.isFocus) {
			this.fileExplorerIcon.addClass('is-active');
		} else {
			this.fileExplorerIcon.removeClass('is-active');
		}
	}

	onunload() {
		if (this.fileExplorerIcon) {
			this.fileExplorerIcon.remove();
			this.fileExplorerIcon = null;
		}
	}
}

export default SimpleFocusPlugin;

