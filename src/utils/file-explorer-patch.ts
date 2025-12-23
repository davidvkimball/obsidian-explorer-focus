import { View, TAbstractFile, TFolder } from "obsidian";
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

// Global flag to track if prototype has been patched
let prototypePatched = false;

export function patchFileExplorer(plugin: ExplorerFocusPlugin): void {
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

						// DON'T do anything in focus mode - let refreshFileExplorerVisibility handle it
						// This ensures all items exist in the DOM
						if (!plugin.isFocus) {
							// Only when NOT in focus mode, ensure all items are visible
							sortedChildren.forEach((vEl) => {
								vEl.info.hidden = false;
							});
						}
						// When in focus mode, do NOTHING here - refreshFileExplorerVisibility will handle visibility

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

export function getFileExplorer(plugin: ExplorerFocusPlugin): FileExplorerView | undefined {
	const fileExplorerContainer = plugin.app.workspace.getLeavesOfType("file-explorer")?.first();
	return fileExplorerContainer?.view as FileExplorerView;
}

export function getAllFileExplorers(plugin: ExplorerFocusPlugin): FileExplorerView[] {
	const fileExplorerLeaves = plugin.app.workspace.getLeavesOfType("file-explorer");
	return fileExplorerLeaves.map(leaf => leaf.view as FileExplorerView);
}

