/*
import { Notice, Modal } from 'obsidian';

// 创建一个 Modal 类，继承自 Modal 类
class ConfirmDialog extends Modal {
	constructor(callback: (confirmed: boolean) => void) {
		super();
		this.callback = callback;
	}

	// Modal 类要求实现一个 getContent 方法，用于返回对话框的内容
	getContent(): HTMLElement {
		const content = document.createElement('div');
		content.textContent = '您确定要执行此操作吗？';

		const buttonsDiv = document.createElement('div');
		const confirmButton = createButton('确认', () => this.callback(true));
		const cancelButton = createButton('取消', () => this.callback(false));
		buttonsDiv.append(confirmButton, cancelButton);

		content.append(buttonsDiv);
		return content;
	}

	// Modal 类要求实现一个 onOpen 方法，在对话框打开时执行
	onOpen(): void {
		this.contentEl.style.maxWidth = '400px';
	}

	// Modal 类要求实现一个 onClose 方法，在对话框关闭时执行
	onClose(): void {
		this.contentEl.remove();
	}
}
*/
