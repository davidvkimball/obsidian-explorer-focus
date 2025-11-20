export interface SimpleFocusSettings {
	showRightClickMenu: boolean;
	showFileExplorerIcon: boolean;
	focusLevel: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom';
	customFolderPath: string;
}

export const DEFAULT_SETTINGS: SimpleFocusSettings = {
	showRightClickMenu: true,
	showFileExplorerIcon: true,
	focusLevel: 'parent',
	customFolderPath: ''
};

export const HIDDEN_CLASS = "plugin-simple-focus-hidden";

