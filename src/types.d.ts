import { TAbstractFile, View } from "obsidian";

// Needed to support monkey-patching of the file explorer

declare module "obsidian" {
	/**
	 * Represents an entry in the file explorer's virtual list.
	 * This is an internal Obsidian structure used for rendering the file tree.
	 */
	export interface PathVirtualElement {
		/** The container element for children of this item */
		childrenEl: HTMLElement;
		/** The collapse/expand arrow element */
		collapseEl: HTMLElement;
		/** Whether the item is currently collapsed */
		collapsed: boolean;
		/** Whether the item can be collapsed (is a folder) */
		collapsible: boolean;
		/** Background cover element used for selection/hover effects */
		coverEl: HTMLElement;
		/** The main container element for this file item */
		el: HTMLElement;
		/** The abstraction of the file/folder in the vault */
		file: TAbstractFile;
		/** Layout and visibility metadata used by Obsidian's virtual list */
		info: {
			childLeft: number;
			childLeftPadding: number;
			childTop: number;
			computed: boolean;
			height: number;
			/** 
			 * Critical property: if true, Obsidian's virtual list will skip 
			 * rendering this item and its children.
			 */
			hidden: boolean;
			pinned?: boolean;
			next: boolean;
			queued: boolean;
			width: number;
		};
		/** The inner content element containing icon and text */
		innerEl: HTMLElement;
		/** Reference to the parent folder's virtual element */
		parent?: PathVirtualElement;
		/** Spacer element used for indentation */
		pusherEl: HTMLElement;
		/** The element containing the item's own content (usually same as innerEl but structure varies) */
		selfEl: HTMLElement;
		/** Container for child elements in the virtual list */
		vChildren: {
			children: PathVirtualElement;
		};
	}

	/**
	 * Augmentation of the internal File Explorer view.
	 */
	export interface FileExplorerView extends View {
		/** Triggers a re-sort and re-render of the file items */
		requestSort(): void;
		/** Internal flag to track if our focus patches have been applied */
		fileExplorerPlusPatched?: boolean;

		/** 
		 * Map of all file items indexed by their vault path.
		 * Used for direct DOM manipulation and visibility updates.
		 */
		fileItems: {
			[key: string]: PathVirtualElement;
		};
	}
}

