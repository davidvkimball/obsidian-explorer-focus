import { AbstractInputSuggest, App, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	getSuggestions(query: string): TFolder[] {
		const lowerQuery = query.toLowerCase();
		const folders: TFolder[] = [];

		this.app.vault.getAllLoadedFiles().forEach((file) => {
			if (file instanceof TFolder) {
				if (file.path.toLowerCase().includes(lowerQuery)) {
					folders.push(file);
				}
			}
		});

		folders.sort((a, b) => a.path.localeCompare(b.path));
		return folders.slice(0, 20);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createEl('div', { text: folder.path || '/' });
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger('input');
		this.close();
	}
}
