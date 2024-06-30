import {App, Editor, MarkdownFileInfo, MarkdownView, Modal, Notice, Plugin, TFile} from 'obsidian';
import {Snowflake} from './util/Snowflake';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './setting/MyPluginSettings';
import {uploadImage} from './util/UploadImage';
import MarkdownDocument, {MongoDBServer} from "./util/MongoDBServer";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	syncTimer: NodeJS.Timeout | null = null; // 用于存储定时器的引用



	async onload() {
		await this.loadSettings();
		const snowflake = new Snowflake(BigInt(1), BigInt(1));
		const mongoDBServer = new MongoDBServer(this.settings);

		let throttleInterval = this.settings.Throttling * 1000; // 设置节流时间间隔为 1000 毫秒
		let lastUpdateTime = 0; // 记录上次更新时间戳
		let updatePending = false; // 记录是否有更新操作待处理

		// 启动定时同步任务
		this.startSyncTimer();

		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					const content = await this.app.vault.read(file);
					console.log("创建md" + content);
					// 上传Markdown内容到MongoDB
					await this.uploadNoteToMongoDB(file.name, file.name, mongoDBServer);
				}
			})
		);


		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
				const clipboardData = evt.clipboardData;
				if (clipboardData) {
					const items = Array.from(clipboardData.items);
					for (const item of items) {
						if (item.kind === 'file' && item.type.startsWith('image/')) {

							const file = item.getAsFile();
							if (file) {
								const fileName = snowflake.nextId() + '.' + item.type.split('/')[1];

								if (this.settings.ReplacesTheDefaultInsert) {
									if (this.settings.IsSaveLocally) {
										evt.preventDefault();// 阻止粘贴事件
										// 保存文件到本地
										const arrayBuffer = await file.arrayBuffer();
										await this.saveImageLocally(fileName, arrayBuffer);
										// 上传文件到对象存储
										const imageUrl = await uploadImage(file, fileName, this.settings);
										this.insertImageUrl(editor, fileName, imageUrl);
									} else {
										// 直接上传文件到对象存储
										evt.preventDefault();// 阻止粘贴事件
										const imageUrl = await uploadImage(file, fileName, this.settings);
										this.insertImageUrl(editor, fileName, imageUrl);
									}
								} else {

								}

							}
						}
					}
				}


			})
		);

		this.registerEvent(
			this.app.workspace.on('editor-change', async (editor: Editor, info: MarkdownView | MarkdownFileInfo) => {

				if (info instanceof MarkdownView) {
					const currentTime = Date.now();

					if (this.settings.IsUpdateDoc) {

						// 节流逻辑：检查距离上次更新的时间是否超过节流间隔
						if (!updatePending && (currentTime - lastUpdateTime) > throttleInterval) {
							updatePending = true;
							await this.updateNoteToMongoDB(info, mongoDBServer);
							lastUpdateTime = currentTime;
							updatePending = false;
						}
					}
				}
			})
		);



		// 这将在左侧功能区中创建一个图标。
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// 使用功能区执行其他操作
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// 这会在应用底部添加一个状态栏项。不适用于移动应用程序。
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// 这添加了一个可以在任何地方触发的简单命令
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// 这将添加一个编辑器命令，该命令可以对当前编辑器实例执行某些操作
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// 这将添加一个复杂的命令，该命令可以检查应用程序的当前状态是否允许执行命令
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// 这将添加一个设置选项卡，以便用户可以配置插件的各个方面
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// 注册间隔时，该功能会在插件禁用时自动清除间隔。
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}


	insertImageUrl(editor: Editor, fileName: string, imageUrl: string) {
		const cursor = editor.getCursor();
		editor.replaceRange(`![${fileName}](${imageUrl})`, cursor);
	}

	async saveImageLocally(fileName: string, arrayBuffer: ArrayBuffer) {
		const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
		const dataUrl = `data:image/jpeg;base64,${base64String}`;
		await this.app.vault.createBinary(fileName, arrayBuffer);
	}


	onunload() {
		// 插件卸载时的清理工作
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	private async uploadNoteToMongoDB(path: string, content: string, mongoDBServer: MongoDBServer) {
		const markdownDocument: MarkdownDocument = {
			_id: path,
			content: content,
			version: "1.0",
		}
		await mongoDBServer.insertOneDocument(markdownDocument);

	}

	private async updateNoteToMongoDB(info: MarkdownView | MarkdownFileInfo, mongoDBServer: MongoDBServer) {
		if (info instanceof MarkdownView) {
			const documentId = info.getDisplayText(); // 假设使用文件名作为 MongoDB 中的 _id
			const markdownContent = info.getViewData(); // 获取编辑器中的 Markdown 内容

			// 更新到 MongoDB
			await mongoDBServer.updateDocument({
				_id: documentId,
				content: markdownContent,
				version: '1.0' // 假设版本号为固定值或通过其他方式获取
			});
		}
	}

	startSyncTimer() {
		// 如果已经存在定时器，先清理之前的定时器
		this.clearSyncTimer();

		const syncInterval = this.settings.SyncInterval * 1000; // 将设置的秒数转换为毫秒

		// 设置定时器，每隔 syncInterval 毫秒执行一次同步操作
		this.syncTimer = setInterval(async () => {
			await this.syncAllNotesToMongoDB();
		}, syncInterval);
	}

	clearSyncTimer() {
		// 清理定时器
		if (this.syncTimer) {
			clearInterval(this.syncTimer);
			this.syncTimer = null;
		}
	}

	//TODO 实现同步所有笔记到 MongoDB 的逻辑
	async syncAllNotesToMongoDB() {
		// 实现同步所有笔记到 MongoDB 的逻辑
		// 遍历所有笔记，调用 updateDocument 或者其他同步方法
	}


}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
