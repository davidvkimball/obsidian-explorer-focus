export interface ExplorerFocusSettings {
	showRightClickMenu: boolean;
	showFileExplorerIcon: boolean;
	focusLevel: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom';
	customFolderPath: string;
	hideAncestorFolders: boolean;
}

export const DEFAULT_SETTINGS: ExplorerFocusSettings = {
	showRightClickMenu: true,
	showFileExplorerIcon: true,
	focusLevel: 'parent',
	customFolderPath: '',
	hideAncestorFolders: false
};

