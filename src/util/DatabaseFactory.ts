import { MyPluginSettings } from '../setting/MyPluginSettings';
import {MongoDBServer} from './MongoDBServer';
import {CouchDBServer} from './CouchDBServer';
import MarkdownDocument from './MarkdownDocument';
import {Platform} from "obsidian";

interface IDatabaseServer {
	testConnection(): Promise<boolean>;
	upsertDocument(doc: MarkdownDocument): Promise<void>;
	deleteDocument(docId: string): Promise<void>;
	getDocument(docId: string): Promise<MarkdownDocument | null>;
	getAllDocumentIds(): Promise<string[]>;
	updateDocumentPath(oldPath: string, newPath: string): Promise<void>;
}

export class DatabaseFactory {
	private readonly server: IDatabaseServer;

	constructor(private settings: MyPluginSettings) {
		this.server = this.createServer();
	}

	private createServer(): IDatabaseServer {

		return new CouchDBServer(this.settings);
	/*	if (this.settings.DatabaseType === 'MongoDB'&&!Platform.isMobile) {
			console.log("创建MongoDB实例")
			return new MongoDBServer(this.settings);
		} else if (this.settings.DatabaseType === 'CouchDB') {
			console.log("创建CouchDB实例")
			return new CouchDBServer(this.settings);
		} else {
			throw new Error('Unsupported database type');
		}*/
	}


	public getServer(): IDatabaseServer {
		return this.server;
	}
}
