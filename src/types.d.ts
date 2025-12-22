import { TAbstractFile, View } from "obsidian";

// Needed to support monkey-patching of the file explorer

declare module "obsidian" {
	export interface PathVirtualElement {
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
	}

	export interface FileExplorerView extends View {
		requestSort(): void;
		fileExplorerPlusPatched?: boolean;

		fileItems: {
			[key: string]: PathVirtualElement;
		};
	}
}

