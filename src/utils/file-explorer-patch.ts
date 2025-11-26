import { View, TAbstractFile } from "obsidian";
import { around } from "monkey-around";
import { SimpleFocusPlugin } from "../main";
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

// Global flag to track if prototype has been patched
let prototypePatched = false;

export function patchFileExplorer(plugin: SimpleFocusPlugin): void {
	const fileExplorer = getFileExplorer(plugin);

	if (!fileExplorer) {
		return; // File explorer not available yet, will be patched on layout-change
	}

	// Patch the prototype only once (affects all instances)
	if (!prototypePatched) {
		const leaf = plugin.app.workspace.getLeaf(true);

		plugin.register(
			around(Object.getPrototypeOf(fileExplorer), {
				getSortedFolderItems(old: GetSortedFolderItemsFunction) {
					return function (this: FileExplorerView, folder: TAbstractFile): PathVirtualElement[] {
						let sortedChildren: PathVirtualElement[] = old.call(this, folder);

						// Apply focus hiding if focus mode is active
						if (plugin.isFocus && plugin.focusedPath) {
							const focusedPath = plugin.focusedPath!;
							
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

		leaf.detach();
		prototypePatched = true;
	}

	// Mark this instance as patched
	fileExplorer.fileExplorerPlusPatched = true;
}

export function getFileExplorer(plugin: SimpleFocusPlugin): FileExplorerView | undefined {
	const fileExplorerContainer = plugin.app.workspace.getLeavesOfType("file-explorer")?.first();
	return fileExplorerContainer?.view as FileExplorerView;
}

export function getAllFileExplorers(plugin: SimpleFocusPlugin): FileExplorerView[] {
	const fileExplorerLeaves = plugin.app.workspace.getLeavesOfType("file-explorer");
	return fileExplorerLeaves.map(leaf => leaf.view as FileExplorerView);
}

