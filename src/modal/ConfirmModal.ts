import { App, Modal, Setting } from "obsidian";
import "styles.css";
import { ButtonConfig } from "./ButtonConfig";

export class ConfirmModal extends Modal {
	title?: string;
	contentElement?: HTMLElement;
	isCompareFilesConfirmModal?: boolean;
	buttonConfigs: ButtonConfig[];

	constructor(app: App,
				title?: string,
				contentElement?: HTMLElement,
				isCompareFilesConfirmModal?: boolean,
				...buttonConfigs: ButtonConfig[]) {
		super(app);
		this.title = title;
		this.contentElement = contentElement;
		this.isCompareFilesConfirmModal = isCompareFilesConfirmModal;
		this.buttonConfigs = buttonConfigs;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h3", { text: this.title || "默认标题" });

		if (this.contentElement) {
			contentEl.appendChild(this.contentElement); // Append the DOM element directly
		}

		const buttonContainer = contentEl.createDiv({ cls: 'button-container' });

		this.buttonConfigs.forEach(config => {
			new Setting(buttonContainer)
				.setClass('custom-setting-item')
				.addButton(btn =>
					btn
						.setButtonText(config.text)
						.setClass('confirm-button')
						.setCta()
						.onClick(() => {
							this.close();
							config.onClick();
						})
				);
		});

		const modalContainer = contentEl.parentElement;
		if (modalContainer) {
			if (this.isCompareFilesConfirmModal) {
				contentEl.parentElement.addClass('compare-files-confirm-modal-container');
			} else {
				contentEl.parentElement.addClass('confirm-modal-container');
			}
		}
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
