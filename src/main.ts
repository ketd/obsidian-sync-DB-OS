import {
	App,
	Editor,
	MarkdownFileInfo,
	MarkdownView,
	Modal,
	Notice,
	Plugin, TAbstractFile,
	TFile,
} from 'obsidian';
import { syncDbOsSettingTab} from './setting/SyncDbOsPluginSettings';
import {manualSyncing} from "./sync/ManualSyncing";
import {pull} from "./sync/Pull";
import {push} from "./sync/Push";
import {DatabaseFactory} from "./util/db/DatabaseFactory";
import {TencentOSServer} from "./util/os/TencentOSServer";
import {Util} from "./util/Util";
import {Handler} from "./util/Handler";
import {ConfirmModal} from "./modal/ConfirmModal";
import {DEFAULT_SETTINGS, syncDbOsPluginSettings} from "./setting/SettingsData";


export default class syncDbOsPlugin extends Plugin {
	settings: syncDbOsPluginSettings;
	factory: DatabaseFactory;
	tencentOSServer: TencentOSServer
	util: Util = new Util()
	private isPulling: boolean = false; // 添加这个标志
	async onload() {

		await this.loadSettings();
		this.factory = new DatabaseFactory(this.settings);
		this.tencentOSServer = new TencentOSServer(this.settings)
		const handler = new Handler(this.app, this.settings, this.factory, this.tencentOSServer)
// 这将添加一个设置选项卡，以便用户可以配置插件的各个方面
		this.addSettingTab(new syncDbOsSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on('create', async (file) => {

				if(this.settings.AutomaticallyUploadedOnCreation){
					await handler.CreateHandler(file, this.isPulling)
				}
			})
		);


		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
				await handler.EditorPasteHandler(evt, editor);
			})
		);

		this.registerEvent(
			this.app.workspace.on('editor-change', async (editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
				if(this.settings.IsAutoSave){
					await handler.EditorChangeHandler(editor, info);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('file-open', async (file: TFile | null) => {
				await handler.FileOpenHandler(file)
			})
		)

		this.registerEvent(
			this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
				await handler.RenameHandler(file, oldPath)
			})
		);


		// 这将在左侧功能区中创建一个图标。
		const ribbonIconEl = this.addRibbonIcon('refresh-ccw', '同步', async (evt: MouseEvent) => {
			// 在用户单击图标时调用。
			await manualSyncing(evt, this.app, this.settings, this.factory)

			new Notice('手动同步成功!');
		});

		const replacementIconEl = this.addRibbonIcon('replace', '替换为图床', async (evt: MouseEvent) => {


				new ConfirmModal(
					this.app,
					'这将把你md文档中的连接本地图片全部替换为网络图片',
					undefined, // 如果没有 HTML 可以传入 undefined
					false,
					{
						text: '替换当前文件夹', onClick: async () => {
							await this.util.replaceLocalImagesWithCloudUrls(this.app,false, this.tencentOSServer);
						}
					},
					{
						text: '替换全部', onClick: async () => {
							await this.util.replaceLocalImagesWithCloudUrls(this.app,true, this.tencentOSServer);
						}
					},
					{
						text: '取消', onClick: () => {}
					},
				).open();

		});


		const statusBarItem = this.addStatusBarItem();


		// 这将在左侧功能区中创建一个图标。
		const pushIconEl = this.addRibbonIcon('arrow-up-from-line', '推送所有笔记', async (evt: MouseEvent) => {
			// 在用户单击图标时调用。
			await push(this.app, this.settings, this.factory,statusBarItem);
		});



		const pullIconEl = this.addRibbonIcon('git-pull-request', '拉取云端', async (evt: MouseEvent) => {
			this.isPulling = true; // 开始拉取操作前设置标志
			try {
				await pull(this.app, this.factory, this.tencentOSServer,statusBarItem);

				new Notice('拉取云端成功!');
			} catch (error) {
				console.error('Error pulling from cloud:', error);
				new Notice('拉取云端失败!');
			} finally {
				this.isPulling = false; // 拉取操作完成后重置标志
			}
		});


		// 使用功能区执行其他操作
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		// 这会在应用底部添加一个状态栏项。不适用于移动应用程序。
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		/*// 这添加了一个可以在任何地方触发的简单命令
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
		this.addSettingTab(new syncDbOsSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {

		});
*/
		// 注册间隔时，该功能会在插件禁用时自动清除间隔。
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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


}
