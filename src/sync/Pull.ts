import {App, Notice, TFile} from 'obsidian';
import { MongoDBServer } from '../util/MongoDBServer';
import {DatabaseFactory} from "../util/DatabaseFactory";

export async function pull(app: App, factory: DatabaseFactory) {
	const allDocumentIds = await factory.getServer().getAllDocumentIds();
	console.log(allDocumentIds);

	for (const id of allDocumentIds) {
		const file = app.vault.getAbstractFileByPath(id);
		if (!file) {
			// Obsidian 中不存在此文件，获取文档内容并创建相应的笔记
			const document = await factory.getServer().getDocument(id);
			if (document) {
				const filePath = document._id;
				const fileContent = document.content;

				// 解析并创建文件夹
				const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));

				try {
					await createFolderIfNotExists(app, folderPath);
				}catch (e){
				}

				// 创建文件
				await app.vault.create(filePath, fileContent);
			}
		}
	}
	new Notice('拉取云端成功!');
}

// 创建文件夹，如果不存在
async function createFolderIfNotExists(app: App, folderPath: string) {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder) {
		const parentFolder = folderPath.substring(0, folderPath.lastIndexOf('/'));
		if (parentFolder) {
			await createFolderIfNotExists(app, parentFolder);
		}
		await app.vault.createFolder(folderPath);
	}
}
