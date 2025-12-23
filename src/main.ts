import { App, Plugin, PluginManifest, TFolder } from "obsidian";
import langs, { Lang } from '../lang';
import { ExplorerFocusSettings, DEFAULT_SETTINGS } from './types';
import { ExplorerFocusSettingTab } from './ui/settings-tab';
import { registerCommands } from './commands';
import { createFileExplorerIcon, insertFileExplorerIcon, findNavButtonsContainer } from './utils/file-explorer';
import { patchFileExplorer as patchFileExplorerUtil, getAllFileExplorers, FileExplorerView } from './utils/file-explorer-patch';
import { getFocusPath } from './utils/focus';

export class ExplorerFocusPlugin extends Plugin {
	isFocus: boolean;
	focusedPath: string | null;
	lang: Lang;
	settings!: ExplorerFocusSettings;
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

		this.addSettingTab(new ExplorerFocusSettingTab(this.app, this));

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
		}, 0);
	}

	refreshFileExplorerVisibility(fileExplorer: FileExplorerView): void {
		console.log('[ExplorerFocus] refreshFileExplorerVisibility called', {
			hasFileItems: !!fileExplorer?.fileItems,
			isFocus: this.isFocus,
			focusedPath: this.focusedPath,
			fileItemsCount: fileExplorer?.fileItems ? Object.keys(fileExplorer.fileItems).length : 0
		});

		if (!fileExplorer?.fileItems) {
			console.log('[ExplorerFocus] No fileItems, returning');
			return;
		}

		const hideAncestors = this.settings.hideAncestorFolders;
		const focusedPath = this.isFocus && this.focusedPath ? this.focusedPath.trim() : null;
		const focusedDepth = focusedPath ? focusedPath.split("/").length - 1 : 0;
		const indentPerLevel = 17; // Obsidian uses ~17px per level based on the HTML you provided

		console.log('[ExplorerFocus] Focus state', {
			isFocus: this.isFocus,
			focusedPath,
			focusedDepth,
			hideAncestors
		});

		// If not in focus mode, show everything and restore ancestor titles
		if (!this.isFocus || !focusedPath) {
			console.log('[ExplorerFocus] Not in focus mode, showing everything');
			Object.values(fileExplorer.fileItems).forEach((vEl) => {
				if (!vEl || !vEl.el) return;
				if (vEl.info) vEl.info.hidden = false;
				vEl.el.removeAttribute('data-explorer-focus-hidden');
				vEl.el.style.removeProperty('display');
				vEl.el.setCssProps({ display: '' });
				
				// Restore ancestor folder titles and indentation lines that might have been hidden
				const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
				if (treeItemSelf && treeItemSelf.style.display === 'none') {
					treeItemSelf.style.removeProperty('display');
				}
				// Restore indentation lines (borders) and container margin/padding
				if (vEl.el.hasAttribute('data-explorer-focus-ancestor-hidden')) {
					const treeItemChildren = vEl.el.querySelector('.tree-item-children') as HTMLElement;
					if (treeItemChildren) {
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-border')) {
							const originalBorder = treeItemChildren.getAttribute('data-explorer-focus-original-border') || '';
							treeItemChildren.style.removeProperty('border-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-border');
						}
						// Restore children container margin and padding
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-margin')) {
							treeItemChildren.style.removeProperty('margin-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-margin');
						}
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-padding')) {
							treeItemChildren.style.removeProperty('padding-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-padding');
						}
					}
					// Restore container margin and padding
					if (vEl.el.hasAttribute('data-explorer-focus-original-margin')) {
						vEl.el.style.removeProperty('margin-inline-start');
						vEl.el.removeAttribute('data-explorer-focus-original-margin');
					}
					if (vEl.el.hasAttribute('data-explorer-focus-original-padding')) {
						vEl.el.style.removeProperty('padding-inline-start');
						vEl.el.removeAttribute('data-explorer-focus-original-padding');
					}
					vEl.el.removeAttribute('data-explorer-focus-ancestor-hidden');
				}
			});
			return;
		}

		let visibleCount = 0;
		const allItems = Object.values(fileExplorer.fileItems);
		console.log('[ExplorerFocus] Processing', allItems.length, 'items');

		// Manually update visibility of all file items in the DOM
		allItems.forEach((vEl) => {
			if (!vEl || !vEl.el) {
				return;
			}

			const filePath = vEl.file.path.trim();
			let shouldShow = !this.isFocus; // Default: show everything if not in focus mode
			let needsIndentAdjustment = false;

			if (this.isFocus && focusedPath) {
				// FORCE SHOW: Items that match the focused path exactly
				if (filePath === focusedPath) {
					console.log('[ExplorerFocus] MATCH:', filePath, '===', focusedPath);
					shouldShow = true;
					needsIndentAdjustment = hideAncestors && focusedDepth > 0;
					visibleCount++;
				}
				// FORCE SHOW: Items that are children of the focused path
				else if (filePath.startsWith(focusedPath + "/")) {
					console.log('[ExplorerFocus] CHILD:', filePath, 'starts with', focusedPath + "/");
					shouldShow = true;
					needsIndentAdjustment = hideAncestors && focusedDepth > 0;
					visibleCount++;
				}
				// Show items that are ancestors of the focused path (only if not hiding ancestors)
				else if (!hideAncestors && focusedPath.startsWith(filePath + "/")) {
					shouldShow = true;
					visibleCount++;
				}
				// Special case: if focused path is at root level, show all other root-level items
				else if (!focusedPath.includes("/")) {
					// Focused item is at root level, show all root-level siblings
					if (!filePath.includes("/")) {
						shouldShow = true;
						visibleCount++;
					} else {
						shouldShow = false;
					}
				}
				// Hide everything else
				else {
					shouldShow = false;
				}
			} else {
				// Not in focus mode - show everything
				shouldShow = true;
				visibleCount++;
			}

			// FORCE update the hidden state in the virtual element
			if (vEl.info) {
				vEl.info.hidden = !shouldShow;
			}

			// FORCE update the DOM element visibility - use both methods to ensure it works
			if (shouldShow) {
				console.log('[ExplorerFocus] Showing item:', filePath, 'element:', vEl.el);
				// Remove hidden attribute and display style
				vEl.el.removeAttribute('data-explorer-focus-hidden');
				vEl.el.style.removeProperty('display');
				vEl.el.setCssProps({ display: '' });
				
				// Force remove any display:none
				vEl.el.style.display = '';
				
				// Show ALL parent containers - we need them for children to be visible
				// We'll hide ancestor titles separately
				let parent = vEl.el.parentElement;
				while (parent && parent !== fileExplorer.containerEl) {
					if (parent.style.display === 'none') {
						console.log('[ExplorerFocus] Showing parent container:', parent.className);
						parent.style.display = '';
					}
					parent = parent.parentElement;
				}
				
				// Adjust indentation if hiding ancestors
				if (needsIndentAdjustment && focusedDepth > 0) {
					// Find the tree-item-self element (the one with margin-inline-start and padding-inline-start)
					const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
					if (treeItemSelf) {
						// Calculate the item's absolute depth
						const itemDepth = filePath.split("/").length - 1;
						
						// Calculate how many levels to remove to get to root
						// Remove focusedDepth levels so focused item appears at root
						const levelsToRemove = focusedDepth;
						const reduction = levelsToRemove * indentPerLevel;
						
						// Calculate what the margin and padding SHOULD be based on depth
						// Root level (depth 0): margin = 0px, padding = 24px
						// Each level adds: margin -= 17px, padding += 17px
						// So at depth N: margin = -N*17px, padding = 24 + N*17px
						
						// New values (after removing focusedDepth levels):
						const newDepth = itemDepth - levelsToRemove;
						const newMargin = -(newDepth * indentPerLevel);
						const newPadding = 24 + (newDepth * indentPerLevel);
						
						// Also adjust the virtual element's info values
						if (vEl.info) {
							vEl.info.childLeft = Math.max(0, vEl.info.childLeft - reduction);
							vEl.info.childLeftPadding = Math.max(24, vEl.info.childLeftPadding - reduction);
						}
						
						// Set margin and padding - this should position items correctly
						treeItemSelf.style.setProperty('margin-inline-start', `${newMargin}px`, 'important');
						treeItemSelf.style.setProperty('padding-inline-start', `${newPadding}px`, 'important');
						
						treeItemSelf.setAttribute('data-indent-adjusted', 'true');
					}
				} else {
					// Clear any indentation adjustments when not needed
					const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
					if (treeItemSelf && treeItemSelf.hasAttribute('data-indent-adjusted')) {
						treeItemSelf.style.removeProperty('margin-inline-start');
						treeItemSelf.style.removeProperty('padding-inline-start');
						treeItemSelf.removeAttribute('data-indent-adjusted');
					}
				}
			} else {
				// Hide element - but check if it's an ancestor that should be hidden
				const shouldHide = true;
				if (hideAncestors && focusedPath && focusedPath.startsWith(filePath + "/")) {
					// This is an ancestor - definitely hide it
					console.log('[ExplorerFocus] Hiding ancestor:', filePath);
				}
				vEl.el.setCssProps({ display: 'none' });
				vEl.el.setAttribute('data-explorer-focus-hidden', 'true');
			}
		});

		console.log('[ExplorerFocus] After processing, visibleCount:', visibleCount);

		// CRITICAL: If nothing is visible, force show everything that matches focused path
		// This is a safety net to prevent everything from disappearing
		if (visibleCount === 0) {
			console.log('[ExplorerFocus] WARNING: Nothing visible! Force showing focused path and children');
			allItems.forEach((vEl) => {
				if (!vEl || !vEl.el) return;
				const filePath = vEl.file.path.trim();
				console.log('[ExplorerFocus] Checking item:', filePath, 'against focused:', focusedPath);
				// Show focused path and all its children
				if (filePath === focusedPath || filePath.startsWith(focusedPath + "/")) {
					console.log('[ExplorerFocus] FORCE SHOWING:', filePath, 'element:', vEl.el, 'current display:', vEl.el.style.display, 'computed:', getComputedStyle(vEl.el).display);
					vEl.el.removeAttribute('data-explorer-focus-hidden');
					vEl.el.style.removeProperty('display');
					vEl.el.style.display = '';
					vEl.el.setCssProps({ display: '' });
					if (vEl.info) vEl.info.hidden = false;
					
				// Show ALL parent containers - we need them for children to be visible
				// We'll hide ancestor titles separately
				let parent = vEl.el.parentElement;
				while (parent && parent !== fileExplorer.containerEl) {
					if (parent.style.display === 'none' || getComputedStyle(parent).display === 'none') {
						console.log('[ExplorerFocus] Showing parent container:', parent.className);
						parent.style.display = '';
					}
					parent = parent.parentElement;
				}
					
					visibleCount++;
				}
			});
		}
		
		// Final safety: if STILL nothing visible, show EVERYTHING to prevent blank screen
		if (visibleCount === 0) {
			console.log('[ExplorerFocus] CRITICAL: STILL nothing visible! Showing EVERYTHING as last resort');
			allItems.forEach((vEl) => {
				if (!vEl || !vEl.el) return;
				console.log('[ExplorerFocus] Force showing:', vEl.file.path);
				vEl.el.removeAttribute('data-explorer-focus-hidden');
				vEl.el.style.removeProperty('display');
				vEl.el.setCssProps({ display: '' });
				if (vEl.info) vEl.info.hidden = false;
			});
		}
		
		console.log('[ExplorerFocus] Final visibleCount:', visibleCount);
		
		// CRITICAL: Hide ancestor folder TITLES and hide indentation lines if hideAncestors is true
		// We need to keep the tree-item container visible so children can be shown
		// Hide the indentation line divs (spacer divs with height: 0.1px) that create the vertical lines
		if (hideAncestors && focusedPath) {
			allItems.forEach((vEl) => {
				if (!vEl || !vEl.el) return;
				const filePath = vEl.file.path.trim();
				// If this is an ancestor folder (not the focused path itself, and focused path is a child)
				if (focusedPath.startsWith(filePath + "/") && filePath !== focusedPath && vEl.file instanceof TFolder) {
					console.log('[ExplorerFocus] Hiding ancestor folder title and indentation lines:', filePath);
					// Hide the folder's self element (title), but keep the container visible for children
					const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
					if (treeItemSelf) {
						treeItemSelf.style.display = 'none';
					}
					// Hide indentation lines (borders) on the children container
					// The indentation lines are created by border-inline-start on .tree-item-children
					const treeItemChildren = vEl.el.querySelector('.tree-item-children') as HTMLElement;
					if (treeItemChildren) {
						// Store original border value if not already stored
						if (!treeItemChildren.hasAttribute('data-explorer-focus-original-border')) {
							const originalBorder = window.getComputedStyle(treeItemChildren).borderInlineStart;
							treeItemChildren.setAttribute('data-explorer-focus-original-border', originalBorder);
						}
						// Remove the border to hide the indentation line
						treeItemChildren.style.setProperty('border-inline-start', 'none', 'important');
						
						// Also remove margin and padding from .tree-item-children to eliminate nested indentation
						// This is where the actual indentation comes from in the nested structure
						const childrenMargin = window.getComputedStyle(treeItemChildren).marginInlineStart;
						const childrenPadding = window.getComputedStyle(treeItemChildren).paddingInlineStart;
						if (!treeItemChildren.hasAttribute('data-explorer-focus-original-margin')) {
							treeItemChildren.setAttribute('data-explorer-focus-original-margin', childrenMargin);
							treeItemChildren.setAttribute('data-explorer-focus-original-padding', childrenPadding);
						}
						treeItemChildren.style.setProperty('margin-inline-start', '0', 'important');
						treeItemChildren.style.setProperty('padding-inline-start', '0', 'important');
						
						console.log('[ExplorerFocus] Hiding indentation border and removing margin/padding from children container in:', filePath, 'was:', childrenMargin, childrenPadding);
					}
					// Remove margin and padding from the ancestor container itself to eliminate nested indentation
					// This prevents the nested structure from creating visual indentation
					const computedMargin = window.getComputedStyle(vEl.el).marginInlineStart;
					const computedPadding = window.getComputedStyle(vEl.el).paddingInlineStart;
					if (!vEl.el.hasAttribute('data-explorer-focus-original-margin')) {
						vEl.el.setAttribute('data-explorer-focus-original-margin', computedMargin);
						vEl.el.setAttribute('data-explorer-focus-original-padding', computedPadding);
					}
					vEl.el.style.setProperty('margin-inline-start', '0', 'important');
					vEl.el.style.setProperty('padding-inline-start', '0', 'important');
					console.log('[ExplorerFocus] Removed container margin/padding from:', filePath, 'was:', computedMargin, computedPadding);
					vEl.el.setAttribute('data-explorer-focus-ancestor-hidden', 'true');
					// Mark the whole item as hidden in info, but don't hide the container
					if (vEl.info) vEl.info.hidden = true;
				}
			});
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

	cleanupFocusState(): void {
		// Reset focus state
		this.isFocus = false;
		this.focusedPath = null;

		// Get all file explorer instances
		const fileExplorers = getAllFileExplorers(this);

		// Remove CSS classes from all file explorer containers
		fileExplorers.forEach(fileExplorer => {
			if (fileExplorer?.containerEl) {
				fileExplorer.containerEl.removeClass('explorer-focus-mode');
			}
		});

		// Restore visibility of all file items
		fileExplorers.forEach(fileExplorer => {
			if (!fileExplorer?.fileItems) {
				return;
			}

			// Iterate through all file items and restore their visibility
			Object.values(fileExplorer.fileItems).forEach((vEl) => {
				if (!vEl || !vEl.el) {
					return;
				}

				// Restore visibility in the virtual element
				if (vEl.info) {
					vEl.info.hidden = false;
				}

				// Remove display: none style and data attribute
				vEl.el.setCssProps({ display: '' });
				vEl.el.removeAttribute('data-explorer-focus-hidden');
				
				// Restore ancestor folder titles and indentation lines that might have been hidden
				const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
				if (treeItemSelf) {
					if (treeItemSelf.style.display === 'none') {
						treeItemSelf.style.removeProperty('display');
					}
					// Clear any indentation adjustments
					if (treeItemSelf.hasAttribute('data-indent-adjusted')) {
						treeItemSelf.style.removeProperty('margin-inline-start');
						treeItemSelf.style.removeProperty('padding-inline-start');
						treeItemSelf.removeAttribute('data-indent-adjusted');
					}
				}
				// Restore indentation lines (borders) and container margin/padding
				if (vEl.el.hasAttribute('data-explorer-focus-ancestor-hidden')) {
					const treeItemChildren = vEl.el.querySelector('.tree-item-children') as HTMLElement;
					if (treeItemChildren) {
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-border')) {
							const originalBorder = treeItemChildren.getAttribute('data-explorer-focus-original-border') || '';
							treeItemChildren.style.removeProperty('border-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-border');
						}
						// Restore children container margin and padding
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-margin')) {
							treeItemChildren.style.removeProperty('margin-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-margin');
						}
						if (treeItemChildren.hasAttribute('data-explorer-focus-original-padding')) {
							treeItemChildren.style.removeProperty('padding-inline-start');
							treeItemChildren.removeAttribute('data-explorer-focus-original-padding');
						}
					}
					// Restore container margin and padding
					if (vEl.el.hasAttribute('data-explorer-focus-original-margin')) {
						vEl.el.style.removeProperty('margin-inline-start');
						vEl.el.removeAttribute('data-explorer-focus-original-margin');
					}
					if (vEl.el.hasAttribute('data-explorer-focus-original-padding')) {
						vEl.el.style.removeProperty('padding-inline-start');
						vEl.el.removeAttribute('data-explorer-focus-original-padding');
					}
					vEl.el.removeAttribute('data-explorer-focus-ancestor-hidden');
				}
			});
		});

		// Refresh all file explorers to show everything again
		fileExplorers.forEach(fileExplorer => {
			if (fileExplorer?.requestSort) {
				fileExplorer.requestSort();
			}
		});

		// Force refresh by manually updating visibility
		// Use setTimeout to ensure DOM is ready after requestSort
		setTimeout(() => {
			fileExplorers.forEach(fileExplorer => {
				if (!fileExplorer?.fileItems) {
					return;
				}

				// Ensure all items are visible
				Object.values(fileExplorer.fileItems).forEach((vEl) => {
					if (!vEl || !vEl.el) {
						return;
					}

					vEl.el.setCssProps({ display: '' });
					vEl.el.removeAttribute('data-explorer-focus-hidden');
					if (vEl.info) {
						vEl.info.hidden = false;
					}
					
					// Restore ancestor folder titles and clear indentation adjustments
					const treeItemSelf = vEl.el.querySelector('.tree-item-self') as HTMLElement;
					if (treeItemSelf) {
						if (treeItemSelf.style.display === 'none') {
							treeItemSelf.style.removeProperty('display');
						}
						if (treeItemSelf.hasAttribute('data-indent-adjusted')) {
							treeItemSelf.style.removeProperty('margin-inline-start');
							treeItemSelf.style.removeProperty('padding-inline-start');
							treeItemSelf.removeAttribute('data-indent-adjusted');
						}
					}
					// Restore indentation lines (borders) and container margin/padding
					if (vEl.el.hasAttribute('data-explorer-focus-ancestor-hidden')) {
						const treeItemChildren = vEl.el.querySelector('.tree-item-children') as HTMLElement;
						if (treeItemChildren) {
							if (treeItemChildren.hasAttribute('data-explorer-focus-original-border')) {
								const originalBorder = treeItemChildren.getAttribute('data-explorer-focus-original-border') || '';
								treeItemChildren.style.removeProperty('border-inline-start');
								treeItemChildren.removeAttribute('data-explorer-focus-original-border');
							}
							// Restore children container margin and padding
							if (treeItemChildren.hasAttribute('data-explorer-focus-original-margin')) {
								treeItemChildren.style.removeProperty('margin-inline-start');
								treeItemChildren.removeAttribute('data-explorer-focus-original-margin');
							}
							if (treeItemChildren.hasAttribute('data-explorer-focus-original-padding')) {
								treeItemChildren.style.removeProperty('padding-inline-start');
								treeItemChildren.removeAttribute('data-explorer-focus-original-padding');
							}
						}
						// Restore container margin and padding
						if (vEl.el.hasAttribute('data-explorer-focus-original-margin')) {
							vEl.el.style.removeProperty('margin-inline-start');
							vEl.el.removeAttribute('data-explorer-focus-original-margin');
						}
						if (vEl.el.hasAttribute('data-explorer-focus-original-padding')) {
							vEl.el.style.removeProperty('padding-inline-start');
							vEl.el.removeAttribute('data-explorer-focus-original-padding');
						}
						vEl.el.removeAttribute('data-explorer-focus-ancestor-hidden');
					}
				});
			});
		}, 0);
	}

	onunload() {
		// Clean up focus state first to restore file explorer
		this.cleanupFocusState();

		// Remove the file explorer icon
		if (this.fileExplorerIcon) {
			this.fileExplorerIcon.remove();
			this.fileExplorerIcon = null;
		}
	}
}

export default ExplorerFocusPlugin;

