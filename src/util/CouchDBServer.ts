import { MyPluginSettings } from '../setting/MyPluginSettings';
import nano, {DocumentListResponse, DocumentBulkResponse, Configuration} from 'nano';
import {Notice} from "obsidian";

export class CouchDBServer {

	private db: nano.DocumentScope<any>;

	constructor(private settings: MyPluginSettings) {
		// 注意：我们不能在构造函数中等待异步操作完成，
		// 所以建议在调用init之后的其他地方处理实际的初始化逻辑。
		this.init().then(() => {
			console.log('CouchDB 初始化完成');
			// 进行其他需要在初始化之后的操作
		}).catch((error) => {
			console.error('初始化失败:', error);
		});
	}

	private async init() {
		const URL = this.settings.URLByCouchDB;
		const USerName = this.settings.USerNameByCouchDB;
		const Password = this.settings.PasswordByCouchDB;
		const DateBaseName = this.settings.DateBaseNameByCouchDB;

		const encodedUSerName = encodeURIComponent(USerName);
		const encodedPassword = encodeURIComponent(Password);

		const config: Configuration = {
			url: URL,
			requestDefaults: {
				timeout: 10000, // 10秒超时
				auth: {
					username: encodedUSerName,
					password: encodedPassword,
				},
			},
		};

		try {
			const nanoInstance = nano(config);
			this.db = nanoInstance.db.use(DateBaseName);
			console.log('CouchDB 初始化成功');
		} catch (error) {
			console.error('Error initializing nano instance:', error);
			throw error; // 将错误抛出，让调用者处理
		}
	}

	// 测试连接
	public async testConnection(): Promise<boolean> {
		try {
			const info = await this.db.info();
			console.log('Database info:', info);
			new Notice('连接成功');
			return true;
		} catch (error) {
			console.error('Error testing connection:', error);
			new Notice('连接失败');
			return false;
		}
	}

	// 拉取数据
	async pullData(): Promise<any[]> {
		try {
			const response: DocumentListResponse<any> = await this.db.list({ include_docs: true });
			return response.rows.map(row => row.doc);
		} catch (error) {
			console.error('Error pulling data:', error);
			throw error;
		}
	}

	// 推送数据
	async pushData(docs: any[]): Promise<void> {
		try {
			const bulkUpdate = docs.map(doc => ({
				...doc,
				_rev: undefined // 确保不会传递本地的 _rev 属性
			}));

			const response: DocumentBulkResponse[] = await this.db.bulk({ docs: bulkUpdate });

			response.forEach((resp, idx) => {
				if (resp.error) {
					console.error('Error pushing doc:', resp.error, resp.reason);
				} else {
					docs[idx]._rev = resp.rev; // 更新本地文档的 _rev
				}
			});

			console.log('Local data pushed to cloud');
		} catch (error) {
			console.error('Error pushing data:', error);
			throw error;
		}
	}
	// 处理冲突
	async handleConflicts(): Promise<void> {
		try {
			const conflicts: DocumentListResponse<any> = await this.db.list({ conflicts: true });

			for (const row of conflicts.rows) {
				if (row.doc._conflicts) {
					const conflictedRevs = row.doc._conflicts;

					// 处理冲突逻辑，比如选择一个合适的版本，或者手动合并
					for (const rev of conflictedRevs) {
						const conflictingDoc = await this.db.get(row.id, { rev });
						// 处理冲突文档
						console.log(conflictingDoc);
					}
				}
			}

			console.log('Conflicts handled');
		} catch (error) {
			console.error('Error handling conflicts:', error);
			throw error;
		}
	}

	// 自动保存功能（可选）
	enableAutoSave(docs: any[]): void {
		docs.forEach(doc => {
			// 假设 docs 是一个 observable 数据结构
			// 你需要在文档变化时调用 pushData 方法
			doc.onChange = async () => {
				await this.pushData(docs);
			};
		});

		console.log('Auto save enabled');
	}
}
