import { App, Modal, Setting } from "obsidian";
import "styles.css"
import {ButtonConfig} from "./ButtonConfig";

export class ConfirmModal extends Modal {
	title?: string;
	innerHTML?: string;
	minWidth?: number;
    minHeight?: number;
	buttonConfigs: ButtonConfig[];


	constructor(app: App,
				title?: string,
				innerHTML?:string,
				minWidth?:number,
				minHeight?:number,
				...buttonConfigs: ButtonConfig[]) {
		super(app);
		this.title = title;
        this.innerHTML = innerHTML;
		this.minWidth=minWidth;
		this.minHeight=minHeight;
		this.buttonConfigs = buttonConfigs;
	}
	onOpen() {
		const { contentEl } = this;


		contentEl.createEl("h3", { text: this.title || "默认标题" });

		if (this.innerHTML) {
			const htmlContainer = contentEl.createDiv();
			htmlContainer.innerHTML = this.innerHTML;
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

		// Adjust modal size
		this.adjustModalSize();

	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
	adjustModalSize() {
		const modalContainer = this.contentEl.parentElement;
		if (modalContainer) {
			modalContainer.style.minWidth = `${this.minWidth}px`||"400px"; // Adjust as needed
			modalContainer.style.minHeight = `${this.minWidth}px`||"300px"; // Adjust as needed
		}
	}
}
