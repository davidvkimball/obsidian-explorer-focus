import { App, Plugin, PluginManifest } from "obsidian";
import langs, { Lang } from '../lang';
import { SimpleFocusSettings, DEFAULT_SETTINGS, HIDDEN_CLASS } from './types';
import { SimpleFocusSettingTab } from './ui/settings-tab';
import { registerCommands } from './commands';
import { setupMutationObserver, createFileExplorerIcon, insertFileExplorerIcon } from './utils/file-explorer';
import { getFocusPath } from './utils/focus';

export class SimpleFocusPlugin extends Plugin {
	isFocus: boolean;
	focusedPath: string | null;
	lang: Lang;
	settings!: SimpleFocusSettings;
	fileExplorerIcon: HTMLElement | null;
	mutationObserver: MutationObserver | null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		const obsidianLangName = window.localStorage.getItem('language');
		const langName = obsidianLangName === 'zh' ? 'zh' : 'en';
		this.lang = langs[langName];
		this.isFocus = false;
		this.focusedPath = null;
		this.fileExplorerIcon = null;
		this.mutationObserver = null;
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SimpleFocusSettingTab(this.app, this));

		registerCommands(this);

		if (this.settings.showFileExplorerIcon) {
			this.addFileExplorerIcon();
		}

		setupMutationObserver(this);
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
		
		// Hide elements that don't match the focused path
		this.applyFocusHiding(path);
		
		// Update icon if it exists
		this.updateFileExplorerIcon();
	}

	exitFocus() {
		this.isFocus = false;
		this.focusedPath = null;

		const unFocusEls = document.querySelectorAll<HTMLElement>(
			`.${HIDDEN_CLASS}`
		);

		unFocusEls.forEach((unFocusEl) => {
			unFocusEl.removeClass(HIDDEN_CLASS);
		});

		// Update icon if it exists
		this.updateFileExplorerIcon();
	}

	applyFocusHiding(focusPath: string) {
		const hiddenEls = document.querySelectorAll<HTMLElement>(
			`.tree-item:not(:has([data-path="${focusPath}"]),:has([data-path^="${focusPath}/"]))`
		);
		hiddenEls.forEach((hiddenEl) => {
			hiddenEl.addClass(HIDDEN_CLASS);
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
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
		if (this.fileExplorerIcon) {
			this.fileExplorerIcon.remove();
			this.fileExplorerIcon = null;
		}
	}
}

export default SimpleFocusPlugin;

