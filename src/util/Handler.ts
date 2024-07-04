import {App, Editor, MarkdownFileInfo, MarkdownView, Notice, TAbstractFile, TFile} from "obsidian";
import {DatabaseFactory} from "./db/DatabaseFactory";
import {TencentOSServer} from "./os/TencentOSServer";
import {Util} from "./Util";
import {Snowflake} from "./Snowflake";
import {CompareFiles} from "./CompareFiles";
import {ConfirmModal} from "../modal/ConfirmModal";
import {MyPluginSettings} from "../setting/SettingsData";

export class Handler {
	app: App;
	settings: MyPluginSettings;
	factory: DatabaseFactory;
	tencentOSServer: TencentOSServer;
	util: Util;

	throttleInterval; // 设置节流时间间隔为 1000 毫秒
	lastUpdateTime = 0; // 记录上次更新时间戳
	updatePending = false; // 记录是否有更新操作待处理

	constructor(app: App, settings: MyPluginSettings, factory: DatabaseFactory, tencentOSServer: TencentOSServer) {
		this.app = app;
		this.settings = settings;
		this.factory = factory;
		this.tencentOSServer = tencentOSServer;
		this.util = new Util()
		this.throttleInterval = this.settings.Throttling * 1000;
	}

	async CreateHandler(file: TAbstractFile, isPulling: boolean) {
		const server = await this.factory.getServer();
		const allDocumentIds = await server.getAllDocumentIds();
		console.log(!allDocumentIds.indexOf(file.path));
		if (!isPulling && file instanceof TFile && file.extension === 'pdf' && allDocumentIds.indexOf(file.path)) {
			//const content = await this.app.vault.read(file);
			try {
				// 读取文件内容
				const content = await this.app.vault.read(file);
				// 计算文件哈希值（SHA-1）

				const hash = await this.util.computeSampleHash(content);

				const success = await server.upsertDocument({
					_id: file.path,
					content: "",
					fileType: "pdf",
					hash: hash
				});

				if (success) {

					// 创建 File 对象
					// 读取文件内容为 ArrayBuffer
					const adapter = this.app.vault.adapter;
					const arrayBuffer = await adapter.readBinary(file.path);

					// 将 ArrayBuffer 转换为 Blob，然后创建一个新的 File 对象
					const blob = new Blob([arrayBuffer], {type: 'application/pdf'});
					const newFile = new File([blob], file.name, {
						type: 'application/pdf',
						lastModified: new Date().getTime()
					});
					await this.tencentOSServer.uploadFileToOS(newFile, file.path);
				}

			} catch (error) {
				console.error('Error upserting document:', error);
				// Handle error if needed
			}
		} else if (file instanceof TFile && file.extension === 'md' && allDocumentIds.indexOf(file.path)) {
			const content = await this.app.vault.read(file);
			const hash = await this.util.computeSampleHash(content);
			await server.upsertDocument({
				_id: file.path,
				content: content,
				hash: hash
			});
		}
	}

	async EditorPasteHandler(evt: ClipboardEvent, editor: Editor) {
		const clipboardData = evt.clipboardData;
		const snowflake = new Snowflake(BigInt(1), BigInt(1));

		if (clipboardData) {
			const items = Array.from(clipboardData.items);
			for (const item of items) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {

					const file = item.getAsFile();
					if (file) {
						const fileName = snowflake.nextId() + '.' + item.type.split('/')[1];
						const activeFile = this.app.workspace.getActiveFile();
						if (this.settings.ReplacesTheDefaultInsert && activeFile) {
							if (this.settings.IsSaveLocally) {
								evt.preventDefault();// 阻止粘贴事件
								// 保存文件到本地
								// 获取当前文件路径
								const currentFilePath = activeFile.path;
								const subfoldersName = this.settings.SubfoldersName;

								await this.util.saveImageLocally(this.app, fileName, file, subfoldersName, currentFilePath);
								// 上传文件到对象存储
								const imageUrl = await this.tencentOSServer.uploadFileToOS(file, fileName);
								this.insertImageUrl(editor, fileName, imageUrl);
							} else {
								// 直接上传文件到对象存储
								evt.preventDefault();// 阻止粘贴事件
								const imageUrl = await this.tencentOSServer.uploadFileToOS(file, fileName);
								this.insertImageUrl(editor, fileName, imageUrl);
							}
						} else {

						}

					}
				}

				if (item.kind === 'file' && !item.type.startsWith('image/')) {

				}
			}
		}
	}

	insertImageUrl(editor: Editor, fileName: string, imageUrl: string) {
		const cursor = editor.getCursor();
		editor.replaceRange(`![${fileName}](${imageUrl})`, cursor);
	}

	async EditorChangeHandler(editor: Editor, info: MarkdownView | MarkdownFileInfo) {
		if (info instanceof MarkdownView) {
			const currentTime = Date.now();

			if (this.settings.IsUpdateDoc) {

				// 节流逻辑：检查距离上次更新的时间是否超过节流间隔
				if (!this.updatePending && (currentTime - this.lastUpdateTime) > this.throttleInterval) {
					this.updatePending = true;
					await this.updateNoteToDB(editor, info, this.factory);
					this.lastUpdateTime = currentTime;
					this.updatePending = false;
				}
			}
		}
	}

	private async updateNoteToDB(editor: Editor, info: MarkdownView | MarkdownFileInfo, factory: DatabaseFactory) {
		if (info instanceof MarkdownView) {
			const documentId = info.file?.path!; // 假设使用文件名作为 MongoDB 中的 _id
			const markdownContent = info.getViewData(); // 获取编辑器中的 Markdown 内容
			const dbServer = await factory.getServer();

			const hash = await this.util.computeSampleHash(markdownContent);
			await dbServer.upsertDocument({
				_id: documentId,
				content: markdownContent,
				hash: hash
			});
		}
	}

	async FileOpenHandler(file: TFile | null) {
		if (file && file.extension === 'md') {
			const server = await this.factory.getServer();

			const hash = await server.getDocumentHash(file.path);
			if (hash) {
				const fileContent = await this.app.vault.read(file);
				const localFileHash = await this.util.computeSampleHash(fileContent)
				if (localFileHash !== hash) {
					// 你可以在这里添加你的逻辑，比如提示用户同步差异，或者自动同步
					const compareFile = new CompareFiles()
					const cloudContent = await server.getDocument(file.path);
					if (cloudContent) {
						await compareFile.showComparisonPopup(this.app, this.settings, file, fileContent, cloudContent);
					}
				} else {
					console.log(`本地内容和云内容相同${file.path}`);
				}
			} else {
				console.log(`未找到${file.path}`);
			}
		}
		//TODO npm install blake3-wasm无法使用
		else if (file && file.extension === 'pdf') {
			const server = await this.factory.getServer();

			const result = await server.getDocument(file.path);
			if (result) {
				const content = await this.app.vault.read(file);
				// 使用样本哈希计算文件哈希值
				const hash = await this.util.computeSampleHash(content);

				if (result.content !== hash) {

					const filepath = file.path

					new ConfirmModal(
						this.app,
						'与云端同名pdf文件内容不同',
						undefined, // 如果没有 HTML 可以传入 undefined
						undefined,
						undefined,
						{
							text: '重命名此pdf为副本，并且将此pdf上传至云端，同时下载云端同名pdf', onClick: async () => {
								try {
									this.tencentOSServer.downFileToOS(filepath + '_副本.pdf').then(async r => {


										await this.util.SaveFileToLocally(this.app, filepath, r)


										this.app.vault.adapter.rename(filepath, filepath + '_副本.pdf').then(r => {

										})
									}).catch(e => {

									}).finally(async () => {

									})


								} catch (e) {
									console.log(e)
								}
								new Notice('本地文件已被云端文件覆盖');
							}
						},
						{
							text: '覆盖云端pdf', onClick: async () => {
								const server = await this.factory.getServer();
								const content = await this.app.vault.read(file);
								const hash = await this.util.computeSampleHash(content)
								await server.upsertDocument({
									_id: filepath,
									content: "",
									hash: hash
								})

								const arrayBuffer = await this.app.vault.adapter.readBinary(filepath);

								// 将 ArrayBuffer 转换为 Blob，然后创建一个新的 File 对象
								const blob = new Blob([arrayBuffer], {type: 'application/pdf'});
								const newFile = new File([blob], file.name, {
									type: 'application/pdf',
									lastModified: new Date().getTime()
								});
								await this.tencentOSServer.deleteFileToOS(filepath).then(async r => {
									await this.tencentOSServer.uploadFileToOS(newFile, filepath).then(async r => {

									})
								}).catch(e => {

								}).finally(async () => {
								});
								new Notice('云端文件已被本地文件覆盖');
							}
						},
					).open();


					/*popUps.showPdfConflict(file, this.app, this.settings, this.factory);*/
				}
			}
		}


	}

	async RenameHandler(file: TAbstractFile, oldPath: string) {
		try {
			const server = await this.factory.getServer();

			// 判断文件类型
			if (file instanceof TFile && file.extension === 'md' || file instanceof TFile && file.extension === 'pdf') {
				const newPath = file.path;
				await server.updateDocumentPath(oldPath, newPath);
			}
		} catch (e) {
			if (e.status != 404) {
				new Notice("修改目录&重命名失败: " + new Date().toLocaleString());
			}
		}


	}


}
