import { Notice, View, TAbstractFile, Platform } from "obsidian";
import { around } from "monkey-around";
import { ExplorerFocusPlugin } from "../main";
import "../types.d";

// Type definitions from module augmentation
type PathVirtualElement = {
	childrenEl: HTMLElement;
	collapseEl: HTMLElement;
	collapsed: boolean;
	collapsible: boolean;
	coverEl: HTMLElement;
	el: HTMLElement;
	file: TAbstractFile;
	info: {
		childLeft: number;
		childLeftPadding: number;
		childTop: number;
		computed: boolean;
		height: number;
		hidden: boolean;
		pinned?: boolean;
		next: boolean;
		queued: boolean;
		width: number;
	};
	innerEl: HTMLElement;
	parent?: PathVirtualElement;
	pusherEl: HTMLElement;
	selfEl: HTMLElement;
	vChildren: {
		children: PathVirtualElement;
	};
};

export type FileExplorerView = View & {
	requestSort(): void;
	fileExplorerPlusPatched?: boolean;
	fileItems: {
		[key: string]: PathVirtualElement;
	};
	containerEl: HTMLElement;
};

type GetSortedFolderItemsFunction = (folder: TAbstractFile) => PathVirtualElement[];

// Global flags to track patching state
let prototypePatched = false;
let patchingFailed = false;

export function isPatchingFailed(): boolean {
	return patchingFailed;
}

export function patchFileExplorer(plugin: ExplorerFocusPlugin): void {
	// If patching previously failed, don't retry - rely on CSS fallback
	if (patchingFailed) {
		return;
	}

	// For mobile, we explicitly skip prototype patching as it often fails
	// and rely on our robust DOM-based fallback implemented in main.ts
	if (Platform.isMobile) {
		patchingFailed = true; // Set to true to avoid retries, but don't show notice
		return;
	}

	const fileExplorer = getFileExplorer(plugin);

	if (!fileExplorer) {
		return; // File explorer not available yet, will be patched on layout-change
	}

	// Patch the prototype only once (affects all instances)
	if (!prototypePatched) {
		try {
			const prototype = Object.getPrototypeOf(fileExplorer);

			// Verify the method we're patching exists
			if (typeof prototype.getSortedFolderItems !== 'function') {
				throw new Error('getSortedFolderItems method not found on file explorer prototype');
			}

			plugin.register(
				around(prototype, {
					getSortedFolderItems(old: GetSortedFolderItemsFunction) {
						return function (this: FileExplorerView, folder: TAbstractFile): PathVirtualElement[] {
							let sortedChildren: PathVirtualElement[] = old.call(this, folder);

							// Apply focus hiding if focus mode is active
							if (plugin.isFocus && plugin.focusedPath) {
								const focusedPath = plugin.focusedPath;

								sortedChildren = sortedChildren.filter((vEl) => {
									const filePath = vEl.file.path;

									// Show items that match the focused path exactly
									if (filePath === focusedPath) {
										vEl.info.hidden = false;
										return true;
									}

									// Show items that are children of the focused path
									if (filePath.startsWith(focusedPath + "/")) {
										vEl.info.hidden = false;
										return true;
									}

									// Show items that are ancestors of the focused path (parent chain)
									if (focusedPath.startsWith(filePath + "/")) {
										vEl.info.hidden = false;
										return true;
									}

									// Hide everything else
									vEl.info.hidden = true;
									return false;
								});
							} else {
								// Ensure all items are visible when not in focus mode
								sortedChildren.forEach((vEl) => {
									vEl.info.hidden = false;
								});
							}

							return sortedChildren;
						};
					},
				}),
			);

			prototypePatched = true;
		} catch (error) {
			patchingFailed = true;
			console.warn(
				'[Explorer Focus] Failed to patch file explorer. ' +
				'The plugin will use CSS-based hiding as a fallback, which may be less precise. ' +
				'This usually happens after an Obsidian update - please check for plugin updates.',
				error
			);
			new Notice(
				'Explorer Focus: File explorer patching failed. ' +
				'The plugin will still work but may need an update for full functionality.',
				8000
			);
			return;
		}
	}

	// Mark this instance as patched
	fileExplorer.fileExplorerPlusPatched = true;
}

export function getFileExplorer(plugin: ExplorerFocusPlugin): FileExplorerView | undefined {
	const fileExplorerContainer = plugin.app.workspace.getLeavesOfType("file-explorer")?.first();
	return fileExplorerContainer?.view as FileExplorerView;
}

export function getAllFileExplorers(plugin: ExplorerFocusPlugin): FileExplorerView[] {
	const fileExplorerLeaves = plugin.app.workspace.getLeavesOfType("file-explorer");
	return fileExplorerLeaves.map(leaf => leaf.view as FileExplorerView);
}

