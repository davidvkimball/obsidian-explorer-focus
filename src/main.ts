import { App, Plugin, PluginManifest } from "obsidian";
import { ExplorerFocusSettings, DEFAULT_SETTINGS } from './types';
import { ExplorerFocusSettingTab } from './ui/settings-tab';
import { registerCommands } from './commands';
import { createFileExplorerIcon, insertFileExplorerIcon, findNavButtonsContainer } from './utils/file-explorer';
import { patchFileExplorer as patchFileExplorerUtil, getAllFileExplorers, FileExplorerView } from './utils/file-explorer-patch';
import { getFocusPath } from './utils/focus';

export class ExplorerFocusPlugin extends Plugin {
	isFocus: boolean;
	focusedPath: string | null;
	settings!: ExplorerFocusSettings;
	fileExplorerIcon: HTMLElement | null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.isFocus = false;
		this.focusedPath = null;
		this.fileExplorerIcon = null;
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ExplorerFocusSettingTab(this.app, this));

		registerCommands(this);

		if (this.settings.showFileExplorerIcon) {
			this.addFileExplorerIcon();
		}

		this.app.workspace.onLayoutReady(() => {
			this.patchAllFileExplorers();
			this.updateFocusModeClasses();
			this.updateAutoHideStyles();
		});

		this.app.workspace.on("layout-change", () => {
			this.patchAllFileExplorers();
			this.updateFocusModeClasses();
			this.updateAutoHideStyles();
		});
	}

	async loadSettings() {
		const loadedData = await this.loadData() as Partial<ExplorerFocusSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
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
		
		// Force refresh by manually updating visibility (especially important on mobile)
		// Use setTimeout to ensure DOM is ready after requestSort
		setTimeout(() => {
			fileExplorers.forEach(fileExplorer => {
				this.refreshFileExplorerVisibility(fileExplorer);
			});
		}, 0);
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

		// Force refresh by manually updating visibility (especially important on mobile)
		// Use setTimeout to ensure DOM is ready after requestSort
		setTimeout(() => {
			fileExplorers.forEach(fileExplorer => {
				this.refreshFileExplorerVisibility(fileExplorer);
			});
			// Re-apply auto-hide after focus mode clears visibility
			this.updateAutoHideStyles();
		}, 0);
	}

	refreshFileExplorerVisibility(fileExplorer: FileExplorerView): void {
		if (!fileExplorer?.fileItems) {
			return;
		}

		// When exiting focus mode, the patch handles visibility reset via requestSort.
		// We only need to clear any stale hidden attributes.
		if (!this.isFocus || !this.focusedPath) {
			Object.values(fileExplorer.fileItems).forEach((vEl) => {
				if (!vEl?.el) return;
				// Only update if currently marked hidden to minimize DOM operations
				if (vEl.el.hasAttribute('data-explorer-focus-hidden')) {
					if (vEl.info) vEl.info.hidden = false;
					vEl.el.setCssProps({ display: '' });
					vEl.el.removeAttribute('data-explorer-focus-hidden');
				}
			});
			return;
		}

		const focusedPath = this.focusedPath;

		// Pre-compute ancestor paths as a Set for O(1) lookup
		const ancestorPaths = new Set<string>();
		const pathParts = focusedPath.split('/');
		for (let i = 1; i < pathParts.length; i++) {
			ancestorPaths.add(pathParts.slice(0, i).join('/'));
		}

		// Group items by their top-level folder for efficient subtree skipping
		const topLevelFolders = new Map<string, string[]>();
		const rootItems: string[] = [];

		for (const path of Object.keys(fileExplorer.fileItems)) {
			const firstSlash = path.indexOf('/');
			if (firstSlash === -1) {
				rootItems.push(path);
			} else {
				const topLevel = path.substring(0, firstSlash);
				if (!topLevelFolders.has(topLevel)) {
					topLevelFolders.set(topLevel, []);
				}
				topLevelFolders.get(topLevel)!.push(path);
			}
		}

		// Determine which top-level folders need full processing
		const focusedTopLevel = focusedPath.split('/')[0];

		// Process root-level items
		for (const path of rootItems) {
			const vEl = fileExplorer.fileItems[path];
			if (!vEl?.el) continue;

			const shouldShow = path === focusedPath ||
				focusedPath.startsWith(path + '/') ||
				path.startsWith(focusedPath + '/');
			this.updateItemVisibility(vEl, shouldShow);
		}

		// Process each top-level folder
		for (const [topLevel, paths] of topLevelFolders) {
			// Check if this top-level folder needs detailed processing
			const isInFocusPath = topLevel === focusedTopLevel ||
				ancestorPaths.has(topLevel) ||
				focusedPath === topLevel;

			if (!isInFocusPath) {
				// This entire subtree should be hidden - batch hide all items
				for (const path of paths) {
					const vEl = fileExplorer.fileItems[path];
					if (!vEl?.el) continue;
					this.updateItemVisibility(vEl, false);
				}
			} else {
				// This subtree needs individual evaluation
				for (const path of paths) {
					const vEl = fileExplorer.fileItems[path];
					if (!vEl?.el) continue;

					const shouldShow = path === focusedPath ||
						path.startsWith(focusedPath + '/') ||
						ancestorPaths.has(path);
					this.updateItemVisibility(vEl, shouldShow);
				}
			}
		}
	}

	private updateItemVisibility(vEl: { info?: { hidden: boolean }; el: HTMLElement }, shouldShow: boolean): void {
		const currentlyHidden = vEl.el.hasAttribute('data-explorer-focus-hidden');

		// Only update DOM if state actually changes
		if (shouldShow && currentlyHidden) {
			if (vEl.info) vEl.info.hidden = false;
			vEl.el.setCssProps({ display: '' });
			vEl.el.removeAttribute('data-explorer-focus-hidden');
		} else if (!shouldShow && !currentlyHidden) {
			if (vEl.info) vEl.info.hidden = true;
			vEl.el.setCssProps({ display: 'none' });
			vEl.el.setAttribute('data-explorer-focus-hidden', 'true');
		}
	}

	updateFocusModeClasses(): void {
		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			const containerEl = fileExplorer.containerEl;
			if (this.isFocus) {
				containerEl.addClass("explorer-focus-mode");
			} else {
				containerEl.removeClass("explorer-focus-mode");
			}
		});
	}


	addFileExplorerIcon() {
		const handleIconClick = () => {
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
		};

		const addIconToFileExplorer = () => {
			const fileExplorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
			if (fileExplorerLeaves.length === 0) {
				return;
			}

			const fileExplorerView = fileExplorerLeaves[0].view.containerEl;
			const navButtonsContainer = findNavButtonsContainer(fileExplorerView);
			
			if (!navButtonsContainer) {
				return;
			}

			// Check if icon already exists in this container
			if (this.fileExplorerIcon && navButtonsContainer.contains(this.fileExplorerIcon)) {
				return;
			}

			// Remove old icon if it exists elsewhere
			if (this.fileExplorerIcon && this.fileExplorerIcon.parentElement) {
				this.fileExplorerIcon.remove();
			}

			// Create the icon button if it doesn't exist
			if (!this.fileExplorerIcon) {
				this.fileExplorerIcon = createFileExplorerIcon(this);

				// Don't set cursor - let it inherit from .clickable-icon class (cursor: var(--cursor))
				// This matches other file explorer icons which use the CSS variable
				this.fileExplorerIcon.setCssProps({ touchAction: 'manipulation' });

				// Use a unified handler that works for both click and touch
				// On mobile, touch events typically trigger click, but we handle both to be safe
				let touchHandled = false;
				
				this.registerDomEvent(this.fileExplorerIcon, 'touchstart', (evt) => {
					touchHandled = true;
					evt.preventDefault();
					evt.stopPropagation();
					handleIconClick();
					// Reset flag after a short delay
					setTimeout(() => { touchHandled = false; }, 300);
				});

				this.registerDomEvent(this.fileExplorerIcon, 'click', (evt) => {
					// If touchstart already handled it, skip click to avoid double-firing
					if (touchHandled) {
						evt.preventDefault();
						evt.stopPropagation();
						return;
					}
					evt.preventDefault();
					evt.stopPropagation();
					handleIconClick();
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
				const navButtonsContainer = findNavButtonsContainer(fileExplorerView);
				
				if (navButtonsContainer) {
					insertFileExplorerIcon(this.fileExplorerIcon, navButtonsContainer);
				}
			}
		}

		// Don't set cursor - let it inherit from .clickable-icon class (cursor: var(--cursor))
		// This matches other file explorer icons which use the CSS variable
		if (this.fileExplorerIcon.style.cursor) {
			this.fileExplorerIcon.style.removeProperty('cursor');
		}

		// Toggle is-active class based on focus state
		if (this.isFocus) {
			this.fileExplorerIcon.addClass('is-active');
		} else {
			this.fileExplorerIcon.removeClass('is-active');
		}
	}

	updateAutoHideStyles(): void {
		const paths = new Set(
			(this.settings.autoHidePaths ?? [])
				.map(p => p.trim())
				.filter(p => p.length > 0)
		);

		const fileExplorers = getAllFileExplorers(this);
		fileExplorers.forEach(fileExplorer => {
			if (!fileExplorer?.fileItems) return;

			for (const [filePath, vEl] of Object.entries(fileExplorer.fileItems)) {
				if (!vEl?.el) continue;
				const shouldHide = paths.has(filePath);
				const isHidden = vEl.el.hasAttribute('data-explorer-focus-auto-hidden');

				if (shouldHide && !isHidden) {
					vEl.el.setCssProps({ display: 'none' });
					vEl.el.setAttribute('data-explorer-focus-auto-hidden', 'true');
				} else if (!shouldHide && isHidden) {
					vEl.el.setCssProps({ display: '' });
					vEl.el.removeAttribute('data-explorer-focus-auto-hidden');
				}
			}
		});
	}

	onunload() {
		if (this.fileExplorerIcon) {
			this.fileExplorerIcon.remove();
			this.fileExplorerIcon = null;
		}
	}
}

export default ExplorerFocusPlugin;

