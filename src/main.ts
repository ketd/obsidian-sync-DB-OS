import {
	addIcon,
	App,
	Editor,
	MarkdownFileInfo,
	MarkdownView,
	Modal,
	Notice,
	Plugin, TAbstractFile,
	TFile,
	Vault,
	WorkspaceWindow
} from 'obsidian';
import {Snowflake} from './util/Snowflake';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './setting/MyPluginSettings';
import {uploadToTencentOS} from './util/UploadToTencentOS';
import {MongoDBServer} from "./util/MongoDBServer";

import {CompareFiles} from "./util/CompareFiles";
import {manualSyncing} from "./sync/ManualSyncing";
import {pull} from "./sync/Pull";
import {push} from "./sync/Push";
import MarkdownDocument from "./util/MarkdownDocument";
import {DatabaseFactory} from "./util/DatabaseFactory";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	factory: DatabaseFactory;
	private isPulling: boolean = false; // 添加这个标志


	async onload() {
		await this.loadSettings();
		const snowflake = new Snowflake(BigInt(1), BigInt(1));

		this.factory = new DatabaseFactory(this.settings);

		let throttleInterval = this.settings.Throttling * 1000; // 设置节流时间间隔为 1000 毫秒
		let lastUpdateTime = 0; // 记录上次更新时间戳
		let updatePending = false; // 记录是否有更新操作待处理



		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				if (!this.isPulling && file instanceof TFile && file.extension === 'md') {
					const content = await this.app.vault.read(file);
					// 上传Markdown内容到MongoDB
					//await this.uploadNoteToMongoDB(file.path, mongoDBServer);
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
								const activeFile = this.app.workspace.getActiveFile();
								if (this.settings.ReplacesTheDefaultInsert&&activeFile) {
									if (this.settings.IsSaveLocally) {
										evt.preventDefault();// 阻止粘贴事件
										// 保存文件到本地
										// 获取当前文件路径

										const currentFilePath = activeFile.path;
										const subfoldersName= this.settings.SubfoldersName;
										await this.saveImageLocally(fileName, file,subfoldersName,currentFilePath);
										// 上传文件到对象存储
										const imageUrl = await uploadToTencentOS(file, fileName, this.settings);
										this.insertImageUrl(editor, fileName, imageUrl);
									} else {
										// 直接上传文件到对象存储
										evt.preventDefault();// 阻止粘贴事件
										const imageUrl = await uploadToTencentOS(file, fileName, this.settings);
										this.insertImageUrl(editor, fileName, imageUrl);
									}
								} else {

								}

							}
						}

						if (item.kind === 'file' && !item.type.startsWith('image/')){

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
							await this.updateNoteToMongoDB(editor,info, this.factory);
							lastUpdateTime = currentTime;
							updatePending = false;
						}
					}
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('file-open', async (file: TFile | null) => {

				if (file) {
					const result = await this.factory.getServer().getDocument(file.path);
					if (result) {
						const fileContent = await this.app.vault.read(file);
						if (fileContent !== result.content) {
							// 你可以在这里添加你的逻辑，比如提示用户同步差异，或者自动同步
							const compareFile = new CompareFiles()
							await compareFile.showComparisonPopup(this.app, this.settings, file, fileContent, result);
						} else {
							console.log(`本地内容和云内容相同${file.path}`);
						}
					} else {
						console.log(`未找到${file.path}`);
					}
				}

			})
		)


		this.registerEvent(
			this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
				// 判断文件类型
				if (file instanceof TFile) {
					const newPath = file.path;
					// 处理文件重命名逻辑
					new Notice('文件已重命名!');
					// 比如你可以在这里调用 MongoDBServer 的方法来更新数据库中的文件路径
					await this.factory.getServer().updateDocumentPath(oldPath, newPath);
				}
			})
		);


		// 这将在左侧功能区中创建一个图标。
		const ribbonIconEl = this.addRibbonIcon('refresh-ccw', '同步', (evt: MouseEvent) => {
			// 在用户单击图标时调用。
			manualSyncing(evt,this.app,this.settings, this.factory)

			new Notice('手动同步成功!');
		});


		// 这将在左侧功能区中创建一个图标。
		const pushIconEl = this.addRibbonIcon('arrow-up-from-line', '推送所有笔记', (evt: MouseEvent) => {
			// 在用户单击图标时调用。
			push(this.app,this.settings,this.factory);

			new Notice('提交成功!');
		});


		const pullIconEl = this.addRibbonIcon('git-pull-request', '拉取云端', async (evt: MouseEvent) => {
			this.isPulling = true; // 开始拉取操作前设置标志
			await pull(this.app, this.factory);
			this.isPulling = false; // 拉取操作完成后重置标志

			new Notice('拉取云端成功!');
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

		});

		// 注册间隔时，该功能会在插件禁用时自动清除间隔。
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}


	insertImageUrl(editor: Editor, fileName: string, imageUrl: string) {
		const cursor = editor.getCursor();
		editor.replaceRange(`![${fileName}](${imageUrl})`, cursor);
	}

	async saveImageLocally(fileName: string, file: File, subfoldersName: string,currentFilePath: string) {
		const arrayBuffer = await file.arrayBuffer();

		// 获取当前文件夹路径
		const folderPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));

		// 构造子文件夹路径
		const subFolderPath = `${folderPath}/${subfoldersName}`;

		// 创建子文件夹（如果不存在）
		if (!await this.app.vault.adapter.exists(subFolderPath)) {
			await this.app.vault.createFolder(subFolderPath);
		}

		// 构造图片的完整路径
		const imagePath = `${subFolderPath}/${fileName}`;

		// 保存图片
		await this.app.vault.createBinary(imagePath, arrayBuffer);
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


	private async uploadNoteToMongoDB(path: string, mongoDBServer: MongoDBServer) {
		const markdownDocument: MarkdownDocument = {
			_id: path,
			content: "",
		}
		await mongoDBServer.insertOneDocument(markdownDocument);

	}

	private async updateNoteToMongoDB(editor: Editor,info: MarkdownView | MarkdownFileInfo, factory: DatabaseFactory) {
		if (info instanceof MarkdownView) {
			const documentId = info.file?.path!; // 假设使用文件名作为 MongoDB 中的 _id
			const markdownContent = info.getViewData(); // 获取编辑器中的 Markdown 内容
			const dbServer = factory.getServer();

			// 更新到 MongoDB
			await dbServer.upsertDocument({
				_id: documentId,
				content: markdownContent,
			});
		}
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
