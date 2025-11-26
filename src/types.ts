export interface SimpleFocusSettings {
	showRightClickMenu: boolean;
	showFileExplorerIcon: boolean;
	focusLevel: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom';
	customFolderPath: string;
	hideAncestorFolders: boolean;
}

export const DEFAULT_SETTINGS: SimpleFocusSettings = {
	showRightClickMenu: true,
	showFileExplorerIcon: true,
	focusLevel: 'parent',
	customFolderPath: '',
	hideAncestorFolders: false
};

