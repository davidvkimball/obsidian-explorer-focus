import { App, Plugin, PluginManifest, PluginSettingTab, Setting } from "obsidian";
import langs, { Lang }  from './lang'

const hideenClass = "plugin-simple-focus-hidden";

interface SimpleFocusSettings {
	showRightClickMenu: boolean;
	showFileExplorerIcon: boolean;
	focusLevel: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom';
	customFolderPath: string;
}

const DEFAULT_SETTINGS: SimpleFocusSettings = {
	showRightClickMenu: true,
	showFileExplorerIcon: true,
	focusLevel: 'parent',
	customFolderPath: ''
}

class SimpleFocusSettingTab extends PluginSettingTab {
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
			.addDropdown(dropdown => dropdown
				.addOption('file', this.plugin.lang.focusLevelFile)
				.addOption('parent', this.plugin.lang.focusLevelParent)
				.addOption('grandparent', this.plugin.lang.focusLevelGrandparent)
				.addOption('greatgrandparent', this.plugin.lang.focusLevelGreatGrandparent)
				.addOption('custom', this.plugin.lang.focusLevelCustom)
				.setValue(this.plugin.settings.focusLevel)
				.onChange(async (value: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom') => {
					this.plugin.settings.focusLevel = value;
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

class SimpleFocusPlugin extends Plugin {
	isFocus: boolean;
	focusedPath: string | null;
	lang: Lang;
	settings: SimpleFocusSettings;
	fileExplorerIcon: HTMLElement | null;
	mutationObserver: MutationObserver | null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		const obsidianLangName = window.localStorage.getItem('language')
		const langName = obsidianLangName === 'zh' ? 'zh' : 'en';
		this.lang = langs[langName]
		this.isFocus = false;
		this.focusedPath = null;
		this.fileExplorerIcon = null;
		this.mutationObserver = null;
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SimpleFocusSettingTab(this.app, this));

		if (this.settings.showRightClickMenu) {
			this.addFileMenuItem();
		}

		this.addToggleCommand();

		if (this.settings.showFileExplorerIcon) {
			this.addFileExplorerIcon();
		}

		this.setupMutationObserver();
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getFocusPath(path: string, level: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom'): string {
		if (level === 'custom') {
			// Use the custom folder path from settings, regardless of current file
			return this.settings.customFolderPath || path;
		}

		if (level === 'file') {
			return path;
		}

		const parts = path.split('/');
		
		if (level === 'parent') {
			if (parts.length === 1) {
				return path; // Already at root
			}
			return parts.slice(0, -1).join('/');
		}

		if (level === 'grandparent') {
			if (parts.length <= 2) {
				return parts[0] || path; // Return root or first part
			}
			return parts.slice(0, -2).join('/');
		}

		// greatgrandparent
		if (parts.length <= 3) {
			return parts[0] || path; // Return root or first part
		}
		return parts.slice(0, -3).join('/');
	}

	addToggleCommand() {
		this.addCommand({
			id: "simple-focus-toggle",
			name: this.lang.toggleFocus,
			callback: () => {
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
							const focusPath = this.getFocusPath(file.path, this.settings.focusLevel);
							this.enterFocus(focusPath);
						}
					}
				}
			},
		});
	}

	addFileMenuItem() {
		return new Promise((resolve) => {
			this.registerEvent(
				this.app.workspace.on("file-menu", (menu, file) => {
					if (!this.settings.showRightClickMenu) {
						resolve(menu);
						return;
					}

					menu.addItem((item) => {
						item
							.setTitle(this.isFocus ?  this.lang.exitFocus : this.lang.focus)
							.setIcon(this.isFocus ? "log-out" : "focus")
							.onClick(async () => {
								this.toggleFocus(file?.path);
							});
					});
					resolve(menu);
				})
			);
		});
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
			`.${hideenClass}`
		);

		unFocusEls.forEach((unFocusEl) => {
			unFocusEl.removeClass(hideenClass);
		});

		// Update icon if it exists
		this.updateFileExplorerIcon();
	}

	applyFocusHiding(focusPath: string) {
		const hiddenEls = document.querySelectorAll<HTMLElement>(
			`.tree-item:not(:has([data-path="${focusPath}"]),:has([data-path^="${focusPath}/"]))`
		);
		hiddenEls.forEach((hiddenEl) => {
			hiddenEl.addClass(hideenClass);
		});
	}

	setupMutationObserver() {
		// Watch for new tree items being added to the DOM (virtual scrolling)
		this.mutationObserver = new MutationObserver((mutations) => {
			if (!this.isFocus || !this.focusedPath) {
				return;
			}

		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as HTMLElement;
						
						// Check if the added node is a tree-item or contains tree-items
						const treeItems = element.matches?.('.tree-item') 
							? [element] 
							: element.querySelectorAll?.('.tree-item') || [];

						for (const treeItem of Array.from(treeItems)) {
							const pathElement = treeItem.querySelector('[data-path]');
							if (pathElement) {
								const path = pathElement.getAttribute('data-path');
								if (path && !path.startsWith(this.focusedPath) && path !== this.focusedPath) {
									// This item should be hidden
									if (!path.startsWith(this.focusedPath + '/')) {
										treeItem.addClass(hideenClass);
									}
								}
							}
						}
					}
				}
			}
		});

		// Observe the file explorer container
		const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
		if (fileExplorerLeaves.length > 0) {
			const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
			const navFilesContainer = fileExplorerView.querySelector('.nav-files-container');
			if (navFilesContainer) {
				this.mutationObserver.observe(navFilesContainer, {
					childList: true,
					subtree: true
				});
			}
		}

		// Also observe when new file explorer views are created
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (this.mutationObserver) {
					const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
					if (fileExplorerLeaves.length > 0) {
						const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
						const navFilesContainer = fileExplorerView.querySelector('.nav-files-container');
						if (navFilesContainer) {
							this.mutationObserver.disconnect();
							this.mutationObserver.observe(navFilesContainer, {
								childList: true,
								subtree: true
							});
						}
					}
				}
			})
		);
	}

	addFileExplorerIcon() {
		const addIconToFileExplorer = () => {
			const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
			if (fileExplorerLeaves.length === 0) {
				return;
			}

			const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
			const navButtonsContainer = fileExplorerView.querySelector('.nav-buttons-container');
			
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
				this.fileExplorerIcon = document.createElement('div');
				this.fileExplorerIcon.className = 'clickable-icon nav-action-button';
				this.fileExplorerIcon.setAttribute('aria-label', this.lang.toggleFocus);

				// Add click handler (only once)
				this.fileExplorerIcon.addEventListener('click', () => {
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
								const focusPath = this.getFocusPath(file.path, this.settings.focusLevel);
								this.enterFocus(focusPath);
							}
						}
					}
				});
			}
			
			// Set/update icon
			this.updateFileExplorerIcon();

			// Find the position to insert: after all default Obsidian icons, before any .cmdr elements
			// Get all default icons (exclude our icon and cmdr icons)
			const allIcons = Array.from(navButtonsContainer.querySelectorAll('.clickable-icon.nav-action-button'));
			const defaultIcons = allIcons.filter(icon => !icon.classList.contains('cmdr') && icon !== this.fileExplorerIcon);
			const cmdrIcons = Array.from(navButtonsContainer.querySelectorAll('.cmdr'));
			
			if (cmdrIcons.length > 0) {
				// Insert before first cmdr icon
				navButtonsContainer.insertBefore(this.fileExplorerIcon, cmdrIcons[0]);
			} else if (defaultIcons.length > 0) {
				// Insert after last default icon
				navButtonsContainer.insertBefore(this.fileExplorerIcon, defaultIcons[defaultIcons.length - 1].nextSibling);
			} else {
				// Just append if no other icons
				navButtonsContainer.appendChild(this.fileExplorerIcon);
			}
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
				const navButtonsContainer = fileExplorerView.querySelector('.nav-buttons-container');
				
				if (navButtonsContainer) {
					// Find the position to insert: after all default Obsidian icons, before any .cmdr elements
					const allIcons = Array.from(navButtonsContainer.querySelectorAll('.clickable-icon.nav-action-button'));
					const defaultIcons = allIcons.filter(icon => !icon.classList.contains('cmdr') && icon !== this.fileExplorerIcon);
					const cmdrIcons = Array.from(navButtonsContainer.querySelectorAll('.cmdr'));
					
					if (cmdrIcons.length > 0) {
						navButtonsContainer.insertBefore(this.fileExplorerIcon, cmdrIcons[0]);
					} else if (defaultIcons.length > 0) {
						navButtonsContainer.insertBefore(this.fileExplorerIcon, defaultIcons[defaultIcons.length - 1].nextSibling);
					} else {
						navButtonsContainer.appendChild(this.fileExplorerIcon);
					}
				}
			}
		}

		// Toggle is-active class based on focus state
		if (this.isFocus) {
			this.fileExplorerIcon.addClass('is-active');
		} else {
			this.fileExplorerIcon.removeClass('is-active');
		}

		// Only create icon SVG if it doesn't exist - use the same focus icon as right-click menu
		if (!this.fileExplorerIcon.querySelector('svg')) {
			// Create the focus icon SVG (exact match to right-click menu)
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			svg.setAttribute('width', '24');
			svg.setAttribute('height', '24');
			svg.setAttribute('viewBox', '0 0 24 24');
			svg.setAttribute('fill', 'none');
			svg.setAttribute('stroke', 'currentColor');
			svg.setAttribute('stroke-width', '2');
			svg.setAttribute('stroke-linecap', 'round');
			svg.setAttribute('stroke-linejoin', 'round');
			svg.setAttribute('class', 'svg-icon lucide-focus');
			
			// Lucide focus icon - circle with corner brackets
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			circle.setAttribute('cx', '12');
			circle.setAttribute('cy', '12');
			circle.setAttribute('r', '3');
			svg.appendChild(circle);
			
			const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path1.setAttribute('d', 'M3 7V5a2 2 0 0 1 2-2h2');
			svg.appendChild(path1);
			
			const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path2.setAttribute('d', 'M17 3h2a2 2 0 0 1 2 2v2');
			svg.appendChild(path2);
			
			const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path3.setAttribute('d', 'M21 17v2a2 2 0 0 1-2 2h-2');
			svg.appendChild(path3);
			
			const path4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path4.setAttribute('d', 'M7 21H5a2 2 0 0 1-2-2v-2');
			svg.appendChild(path4);
			
			this.fileExplorerIcon.appendChild(svg);
		}
	}
}

export default SimpleFocusPlugin;
