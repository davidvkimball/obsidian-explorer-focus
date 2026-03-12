import { App, Modal, setIcon, Setting, TextComponent } from "obsidian";
import { ExplorerFocusPlugin } from "../main";
import { FolderSuggest } from "./folder-suggest";

export class AutoHideModal extends Modal {
	plugin: ExplorerFocusPlugin;
	private paths: string[];
	private onSave: () => void;
	private addInput: TextComponent | null = null;

	constructor(app: App, plugin: ExplorerFocusPlugin, onSave: () => void) {
		super(app);
		this.plugin = plugin;
		this.paths = [...(plugin.settings.autoHidePaths ?? [])];
		this.onSave = onSave;
	}

	onOpen(): void {
		this.setTitle("Auto-hide folders");
		this.renderContent();
	}

	private renderContent(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("p", {
			text: "The following folders are currently hidden from the file explorer."
		});

		// Wrapper div for the list items (matches native structure)
		const listWrapper = contentEl.createDiv();

		// List existing paths using native Obsidian classes
		this.paths.forEach((path, index) => {
			const row = listWrapper.createDiv({ cls: "mobile-option-setting-item" });

			row.createSpan({
				text: path || "(empty)",
				cls: "mobile-option-setting-item-name"
			});

			const removeBtn = row.createDiv({
				cls: "clickable-icon mobile-option-setting-item-option-icon",
				attr: { "aria-label": "Delete" }
			});
			setIcon(removeBtn, "x");
			removeBtn.addEventListener("click", () => {
				this.paths.splice(index, 1);
				this.renderContent();
			});
		});

		// Add new folder input
		new Setting(contentEl)
			.setName("Folder")
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text.setPlaceholder("Enter folder path");
				this.addInput = text;
			})
			.addButton(button => button
				.setButtonText("Add")
				.onClick(() => {
					const value = this.addInput?.getValue()?.trim();
					if (value) {
						this.paths.push(value);
						this.addInput?.setValue("");
						this.renderContent();
					}
				}));

		// Save / Cancel buttons using native modal-button-container
		const buttonContainer = this.modalEl.createDiv({ cls: "modal-button-container" });

		const saveBtn = buttonContainer.createEl("button", {
			text: "Save",
			cls: "mod-cta"
		});
		saveBtn.addEventListener("click", () => {
			this.plugin.settings.autoHidePaths = this.paths;
			void this.plugin.saveSettings();
			this.plugin.updateAutoHideStyles();
			this.onSave();
			this.close();
		});

		const cancelBtn = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "mod-cancel"
		});
		cancelBtn.addEventListener("click", () => {
			this.close();
		});
	}
}
