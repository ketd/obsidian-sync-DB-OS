import {Notice} from "obsidian";
import MarkdownDocument from "../MarkdownDocument";
import PouchDB from 'pouchdb-browser';
import PouchDBFind from "pouchdb-find";
import {MyPluginSettings} from "../../setting/SettingsData";

PouchDB.plugin(PouchDBFind);

export class CouchDBServer {



    // private db: PouchDB.Database;
	private db: PouchDB.Database;

	constructor(private settings: MyPluginSettings) {
		// 注意：我们不能在构造函数中等待异步操作完成，
		// 所以建议在调用init之后的其他地方处理实际的初始化逻辑。
		this.init().then(() => {
			console.log('CouchDB  初始化完成');
			// 进行其他需要在初始化之后的操作
		}).catch((error) => {
			console.error('初始化失败:', error);
		});
	}

	private async init() {
		const URL = this.settings.URLByCouchDB;
		const port = this.settings.PortByCouchDB;
		const username = this.settings.USerNameByCouchDB;
		const password = this.settings.PasswordByCouchDB;
		const databaseName = this.settings.DateBaseNameByCouchDB;

		const fullURL = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${URL}:${port}/${databaseName}`;

		try {
			this.db = new PouchDB(fullURL);
			console.log('CouchDB 初始化成功');
		} catch (error) {
			console.error('Error initializing PouchDB instance:', error);
			throw error;
		}
	}

	public async testConnection(): Promise<boolean> {
		try {
			const info = await this.db.info();
			console.log('Database info:', info);
			new Notice('CouchDB连接成功');
			return true;
		} catch (error) {
			console.error('Error testing connection:', error);
			new Notice('CouchDB连接失败');
			return false;
		}
	}

	// 创建或更新文档
	public async upsertDocument(doc: MarkdownDocument): Promise<boolean> {
		try {

			const existingDoc = await this.db.get<MarkdownDocument>(doc._id);
			console.log("existingDoc", existingDoc);
			doc._rev = existingDoc._rev;
		} catch (err) {
			if (err.status !== 404) {
				return false;
			}
		}

		try {
			await this.db.put<MarkdownDocument>(doc);
			new Notice('文档保存成功!!');
			return true;
		} catch (err) {
			if (err.name === 'conflict') {
				console.error('文档保存冲突:', err);
				new Notice('文档保存冲突!!');
			} else {
				console.error('文档保存失败:', err);
				new Notice('文档保存失败!!');
			}
			return false;
		}
	}


	// 删除文档
	public async deleteDocument(docId: string): Promise<void> {
		try {
			const doc = await this.db.get<MarkdownDocument>(docId);
			await this.db.remove(doc);
			new Notice('文档删除成功');
		} catch (error) {
			console.error('文档删除失败:', error);
			new Notice('文档删除失败');
		}
	}

	// 获取文档
	public async getDocument(docId: string): Promise<MarkdownDocument | null> {
		try {
			return await this.db.get<MarkdownDocument>(docId);
		} catch (error) {
			if (error.status === 404) {
				return null;
			} else {
				//console.error('获取文档失败:', error);
				new Notice('获取文档失败');
				return null;
			}
		}
	}

	// 获取所有文档的 ID，过滤掉设计文档
	public async getAllDocumentIds(): Promise<string[]> {
		try {
			const allDocs = await this.db.allDocs({ include_docs: false });
			// 过滤掉以 '_design/' 开头的文档
			return allDocs.rows
				.filter(row => !row.id.startsWith('_design/'))
				.map(row => row.id);
		} catch (error) {
			console.error('获取所有文档ID失败:', error);
			new Notice('获取所有文档ID失败');
			throw error;
		}
	}

	public async getDocumentHash(_id: string): Promise<string> {
		try {
			const result = await this.db.query('docs/hash', {
				key: _id,
				include_docs: false // 不包含完整的文档内容，只返回视图映射函数中的值
			});

			return result.rows[0].value;
		} catch (error) {
			console.error('获取文档hash字段失败:', error);
			throw error;
		}
	}



	// 获取所有文档的hash
	public async getAllDocumentHash(): Promise<MarkdownDocument[]> {
		try {
			// 创建索引
			await this.db.createIndex({
				index: {
					fields: ['hash']
				}
			});

			const result = await this.db.find({
				selector: { _id: { $gte: null } },
				fields: ['_id', 'hash']
			});

			console.log(result.docs);
			return result.docs as MarkdownDocument[];
		} catch (err) {
			console.error(err);
			throw err;
		}
	}


	async updateDocumentPath(oldPath: string, newPath: string): Promise<void> {
		try {
			// 获取旧文档
			const doc = await this.db.get<MarkdownDocument>(oldPath);

			// 尝试存储新文档，如果存在冲突则更新文档
			let updatedDoc:MarkdownDocument  = {
				...doc,
				_id: newPath,
				_rev: undefined // 确保未通过本地_rev
			};

			try {
				await this.db.put(updatedDoc);
			} catch (putError: any) {
				if (putError.status === 409) {
					// 获取现有文档的最新修订版本
					const existingDoc = await this.db.get<MarkdownDocument>(newPath);
					updatedDoc._rev = existingDoc._rev;
					await this.db.put(updatedDoc);
				} else {
					throw putError;
				}
			}

			// 删除旧文档
			await this.db.remove(doc);

			new Notice("修改目录&重命名成功: " + new Date().toLocaleString());
		} catch (error) {
			console.error("修改目录&重命名失败:", error);
			//new Notice("修改目录&重命名失败: " + new Date().toLocaleString());
		}
	}


	async pullData(): Promise<any[]> {
		try {
			const response = await this.db.allDocs({ include_docs: true });
			return response.rows.map(row => row.doc);
		} catch (error) {
			console.error('Error pulling data:', error);
			throw error;
		}
	}

	async pushData(docs: any[]): Promise<void> {
		try {
			const bulkUpdate = docs.map(doc => ({
				...doc,
				_rev: undefined // 确保不会传递本地的 _rev 属性
			}));

			const response = await this.db.bulkDocs(bulkUpdate);

			response.forEach((resp:any, idx:any) => {
				if (resp.error) {
					console.error('Error pushing doc:', resp.error);
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

	async handleConflicts(): Promise<void> {
		// 注意：这是一个简化的示例，您需要根据实际情况进行冲突处理策略的实现
		try {
			const response = await this.db.allDocs({ include_docs: true, conflicts: true });
			/*response.rows.forEach(async (row) => {
				if (row.doc._conflicts) {
					// 有冲突的文档处理逻辑
					console.log(`冲突文档: ${row.id}`);
					// 需要实现合适的冲突处理策略
				}
			});*/
			console.log('Conflicts handled');
		} catch (error) {
			console.error('Error handling conflicts:', error);
			throw error;
		}
	}

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
