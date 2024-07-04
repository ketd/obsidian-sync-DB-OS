import * as mongoDB from 'mongodb';
import {Collection, Db, MongoClient} from 'mongodb';

import {Notice} from "obsidian";
import MarkdownDocument from "../MarkdownDocument";
import {MyPluginSettings} from "../../setting/SettingsData";


export class MongoDBServer {
	private client: MongoClient | null = null;
	private db: Db | null = null;
	private collection: Collection<MarkdownDocument> | null = null;

	constructor(private settings: MyPluginSettings) {

	}

	async connectToDatabase(): Promise<void> {


		const encodedUSerName = encodeURIComponent(this.settings.USerNameByMongoDB);
		const encodedPassword = encodeURIComponent(this.settings.PasswordByMongoDB);


		//"mongodb+srv://<username>:<password>@sandbox.jadwj.mongodb.net"
		const client: mongoDB.MongoClient = new mongoDB.MongoClient("mongodb://" + encodedUSerName + ":" + encodedPassword + "@" + this.settings.URLByMongoDB + ":" + this.settings.PortByMongoDB + "?retryWrites=true&w=majority");

		await client.connect();

		this.db = client.db(this.settings.DateBaseNameByMongoDB);

		this.collection = this.db.collection<MarkdownDocument>(this.settings.CollectionName);


		console.log(`Successfully connected to database: ${this.db.databaseName} and collection: ${this.collection.collectionName}`);
	}


	//测试连接
	async testConnection(): Promise<boolean> {
		try {
			await this.connectToDatabase();
			if (this.db) {
				await this.db.command({ping: 1});
			}
			new Notice('MongoDB连接成功');
			return true;
		} catch (error) {
			console.error('Connection test failed:', error);
			new Notice('MongoDB连接失败');
			return false;
		}
	}

	async getDocument(docId: string): Promise<MarkdownDocument | null> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized')
		return await this.collection.findOne({_id: docId});
	}

	async getAllDocument(): Promise<MarkdownDocument[]> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized')
		return await this.collection.find().toArray();
	}
	async getAllDocumentIds(): Promise<string[]> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized');

		const documents = await this.collection.find({}, { projection: { _id: 1 } }).toArray();
		return documents.map(doc => doc._id);
	}

	async getDocumentById(id: string): Promise<MarkdownDocument | null> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized');

		return await this.collection.findOne({ _id: id });
	}

	async insertOneDocument(data: MarkdownDocument): Promise<void> {
		try {
			await this.connectToDatabase();
			if (!this.collection) throw new Error('Collection is not initialized');
			const result = await this.collection.insertOne(data);

			result
				? new Notice(`Successfully created a new game with id ${result.insertedId}`)
				: new Notice("Failed to create a new game.");
		} catch (error) {
			console.error(error);
			new Notice(error.message);
		}
	}


	async upsertDocument(doc: MarkdownDocument): Promise<boolean> {
		try {
			await this.connectToDatabase();
			if (!this.collection) throw new Error('Collection is not initialized');

			const {_id, ...updateData} = doc; // Extract content and version from data

			const result = await this.collection.updateOne(
				{_id: doc._id}, // Filter by document ID
				{$set: updateData}, // 更新内容和版本字段
				{upsert: true} // Insert if document does not exist

			);
			new Notice("上传成功" + new Date().toLocaleString())
			return true;

		} catch (error) {
			console.error(error);

			new Notice("上传失败" + new Date().toLocaleString())
			return false;
		}
	}
	async updateDocumentPath(oldPath: string, newPath: string) {
		try {
			await this.connectToDatabase();
			if (!this.collection) throw new Error('Collection is not initialized');

			// 查找旧文档
			const oldDocument = await this.collection.findOne({_id: oldPath});
			if (!oldDocument) throw new Error('Document not found');

			// 删除旧文档
			await this.collection.deleteOne({_id: oldPath});

			// 创建新文档
			const newDocument = {...oldDocument, _id: newPath};

			// 插入新文档
			await this.collection.insertOne(newDocument);

			new Notice("文件重命名成功: " + new Date().toLocaleString());
		} catch (error) {
			console.error(error);
			new Notice("文件重命名失败: " + new Date().toLocaleString());
		}
	}

	public async deleteDocument(docId: string): Promise<void> {
		try {
			await this.connectToDatabase();
			if (!this.collection) throw new Error('Collection is not initialized');
			await this.collection.deleteOne({ _id: docId });
			new Notice('文档删除成功');
		} catch (error) {
			console.error('文档删除失败:', error);
			new Notice('文档删除失败');
		}
	}

	public async getDocumentHash(_id: string): Promise<string> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized');

		// 使用 findOne() 方法，第一个参数为查询条件，第二个参数为投影对象
		const document = await this.collection.findOne({ _id: _id }, { projection: { hash: 1 } });

		if (!document) throw new Error('Document not found');

		// 返回查询到的 hash 字段
		return document.hash;
	}


	public async getAllDocumentHash(): Promise<MarkdownDocument[]> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized');
		// 查询所有文档，并只返回 _id 和 hash 字段
		const documents = await this.collection.find({}, { projection: { _id: 1, hash: 1 } }).toArray();

		// 将查询结果映射为 MarkdownDocument 对象数组
		return documents.map(doc => ({
			_id: doc._id.toString(), // 将 ObjectId 转换为字符串
			content: '', // 如果需要 content，可以根据需要添加
			hash: doc.hash,
			fileType: '', // 如果需要 fileType，可以根据需要添加
			_rev: '' // 如果需要 _rev，可以根据需要添加
		}));



	}

	async close(): Promise<void> {
		if (this.client) {
			await this.client.close();
			this.client = null;
			this.db = null;
			this.collection = null;
		}
	}


}
