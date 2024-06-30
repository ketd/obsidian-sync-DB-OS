import {MongoClient, Db, Collection, MongoClientOptions, ObjectId} from 'mongodb';
import {MyPluginSettings} from "../setting/MyPluginSettings";
import {Notice} from "obsidian";
import * as mongoDB from "mongodb";


export default class MarkdownDocument {
	constructor(
		public _id: string,
		public content: string,
		public version: string) {
	}
}

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

	/*	async connect(): Promise<void> {

			if (!this.client) {
				const options: MongoClientOptions = {};
				if (this.settings.USerNameByMongoDB && this.settings.PasswordByMongoDB) {
					options.auth = {
						username: this.settings.USerNameByMongoDB,
						password: this.settings.PasswordByMongoDB,
					};
				}
				this.client = new MongoClient(this.settings.URLByMongoDB, options);
				await this.client.connect();
				this.db = this.client.db(this.settings.DateBaseNameByMongoDB);
				this.collection = this.db.collection<MarkdownDocument>(this.settings.CollectionName);
			}
		}*/

	//测试连接
	async testConnection(): Promise<boolean> {
		try {
			await this.connectToDatabase();
			if (this.db) {
				await this.db.command({ping: 1});
			}
			new Notice('连接成功');
			return true;
		} catch (error) {
			console.error('Connection test failed:', error);
			new Notice('连接失败');
			return false;
		}
	}

	async getDocument(filePath: string): Promise<MarkdownDocument | null> {
		await this.connectToDatabase();
		if (!this.collection) throw new Error('Collection is not initialized');
		return await this.collection.findOne({_id: filePath});
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


	async updateDocument(data: MarkdownDocument): Promise<void> {
		try {
			await this.connectToDatabase();
			if (!this.collection) throw new Error('Collection is not initialized');

			const {_id, ...updateData} = data; // Extract content and version from data

			console.log(updateData);
			const result = await this.collection.updateOne(
				{_id: data._id}, // Filter by document ID
				{$set: updateData}, // 更新内容和版本字段
				{upsert: true} // Insert if document does not exist

			);
			new Notice("上传成功" + new Date().toLocaleString())

		} catch (error) {
			console.error(error);

			new Notice("上传失败" + new Date().toLocaleString())
		}
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
