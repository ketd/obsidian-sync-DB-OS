import { CouchDBServer } from './CouchDBServer';
import MarkdownDocument from '../MarkdownDocument';
import { Platform } from 'obsidian';
import { syncDbOsPluginSettings } from "../../setting/SettingsData";

interface IDatabaseServer {
	testConnection(): Promise<boolean>;
	upsertDocument(doc: MarkdownDocument): Promise<boolean>;
	deleteDocument(docId: string): Promise<void>;
	getDocument(docId: string): Promise<MarkdownDocument | null>;
	getDocumentHash(docId: string): Promise<string | null>;
	getAllDocumentIds(): Promise<string[]>;
	updateDocumentPath(oldPath: string, newPath: string): Promise<void>;
	getAllDocumentHash(): Promise<MarkdownDocument[]>;
}

export class DatabaseFactory {
	private server: IDatabaseServer | null = null;

	constructor(private settings: syncDbOsPluginSettings) {
		// 初始化服务器
		this.initializeServer().then(r => {});
	}

	// 异步初始化服务器
	private async initializeServer() {
		this.server = await this.createServer();
	}

	// 将 createServer 修改为异步并使用动态导入
	private async createServer(): Promise<IDatabaseServer> {
		//console.log("Checking platform...");
	//	console.log("Platform.isMobile:", Platform.isMobile);

		if (Platform.isMobile) {
			//console.log("Creating CouchDB instance for mobile");
			return new CouchDBServer(this.settings);
		} else {
			//console.log("Creating database instance for non-mobile");
			if (this.settings.DatabaseType === 'MongoDB') {
			//	console.log("Creating MongoDB instance");
				const { MongoDBServer } = await import('./MongoDBServer'); // 使用动态导入
				return new MongoDBServer(this.settings);
			} else if (this.settings.DatabaseType === 'CouchDB') {
				//console.log("Creating CouchDB instance");
				return new CouchDBServer(this.settings);
			} else {
				throw new Error('Unsupported database type');
			}
		}
	}

	// 确保 getServer 等待初始化完成
	public async getServer(): Promise<IDatabaseServer> {
		await this.initializeServer();
		if (!this.server) {
			throw new Error("Database server initialization failed.");
		}
		return this.server;
	}
}
