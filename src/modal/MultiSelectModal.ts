import { App, Modal, Setting, TFile } from 'obsidian';
import { ButtonConfig } from './ButtonConfig';

export class MultiSelectModal extends Modal {
	title?: string;
	selectedItems: Set<TFile>;
	allSelected: boolean;
	items: TFile[];
	buttonConfigs: ButtonConfig[];
	onSubmit: (result: TFile[]) => void;
	buttons: Map<string, HTMLButtonElement>;
	selectAllCountSpan: HTMLSpanElement; // 用于显示全选数量的span元素

	constructor(app: App, title: string, items: TFile[], onSubmit: (result: TFile[]) => void, ...buttonConfigs: ButtonConfig[]) {
		super(app);
		this.title = title;
		this.items = items;
		this.selectedItems = new Set();
		this.allSelected = false;
		this.onSubmit = onSubmit;
		this.buttonConfigs = buttonConfigs;
		this.buttons = new Map();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h3", { text: this.title || "默认标题" });

		// 全选复选框
		const selectAllContainer = contentEl.createEl('div');
		const selectAllCheckbox = selectAllContainer.createEl('input', { attr: { type: 'checkbox' } });
		selectAllContainer.createEl('span', { text: '全选' });
		this.selectAllCountSpan = selectAllContainer.createEl('span', { text: ` (${this.selectedItems.size})` });

		selectAllCheckbox.addEventListener('change', () => {
			this.allSelected = selectAllCheckbox.checked;
			if (this.allSelected) {
				this.items.forEach(item => this.selectedItems.add(item));
			} else {
				this.selectedItems.clear();
			}
			updateCheckboxes();
			updateSelectAllCheckboxAppearance();
		});

		contentEl.appendChild(selectAllContainer);
		contentEl.createEl('br');

		// 项目列表
		const checkboxes: HTMLInputElement[] = [];

		this.items.forEach(item => {
			const itemContainer = contentEl.createEl('div');
			const checkbox = itemContainer.createEl('input', { attr: { type: 'checkbox' } });
			const textNode = itemContainer.createEl('span', { text: item.path });
			checkboxes.push(checkbox);

			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedItems.add(item);
				} else {
					this.selectedItems.delete(item);
				}
				this.allSelected = checkboxes.every(cb => cb.checked);
				selectAllCheckbox.checked = this.allSelected;
				updateSelectAllCheckboxAppearance();
				updateButtonStates();
				this.selectAllCountSpan.textContent = ` (${this.selectedItems.size})`;
			});

			contentEl.appendChild(itemContainer);
			contentEl.createEl('br');
		});

		// 确认按钮
		const buttonContainer = contentEl.createDiv({ cls: 'button-container' });

		this.buttonConfigs.forEach(config => {
			const btnElement = document.createElement('button');
			btnElement.textContent = config.text;
			btnElement.classList.add('confirm-button');
			btnElement.disabled = config.text === '确认推送' && this.selectedItems.size === 0; // 设置初始禁用状态
			btnElement.addEventListener('click', () => {
				this.close();
				this.onSubmit(Array.from(this.selectedItems));
				config.onClick();
			});
			buttonContainer.appendChild(btnElement);
			this.buttons.set(config.text, btnElement);
		});

		contentEl.appendChild(buttonContainer);

		// 更新所有复选框的选中状态
		const updateCheckboxes = () => {
			checkboxes.forEach(cb => {
				cb.checked = this.allSelected;
			});
			updateButtonStates();
			this.selectAllCountSpan.textContent = ` (${this.selectedItems.size})`;
		};

		// 更新全选复选框的外观
		const updateSelectAllCheckboxAppearance = () => {
			if (this.selectedItems.size > 0 && this.selectedItems.size < this.items.length) {
				selectAllCheckbox.indeterminate = true;
			} else {
				selectAllCheckbox.indeterminate = false;
			}
		};

		// 更新按钮状态
		const updateButtonStates = () => {
			this.buttons.forEach(button => {
				if (button.textContent === '确认推送') {
					button.disabled = this.selectedItems.size === 0;
				}
			});
		};
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
