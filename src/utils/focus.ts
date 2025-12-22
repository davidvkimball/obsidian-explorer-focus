import { ExplorerFocusSettings } from '../types';

export function getFocusPath(
	path: string,
	level: 'file' | 'parent' | 'grandparent' | 'greatgrandparent' | 'custom',
	settings: ExplorerFocusSettings
): string {
	if (level === 'custom') {
		// Use the custom folder path from settings, regardless of current file
		return settings.customFolderPath || path;
	}

	if (level === 'file') {
		return path;
	}

	const parts = path.split('/');
	
	if (level === 'parent') {
		if (parts.length === 1) {
			return path; // Already at root
		}
		return parts.slice(0, -1).join('/');
	}

	if (level === 'grandparent') {
		if (parts.length <= 2) {
			return parts[0] || path; // Return root or first part
		}
		return parts.slice(0, -2).join('/');
	}

	// greatgrandparent
	if (parts.length <= 3) {
		return parts[0] || path; // Return root or first part
	}
	return parts.slice(0, -3).join('/');
}

