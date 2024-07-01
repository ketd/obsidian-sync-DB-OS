import { App, TFile, Notice } from 'obsidian';
import { MongoDBServer } from '../util/MongoDBServer';

import { MyPluginSettings } from '../setting/MyPluginSettings';
import {CompareFiles} from "../util/CompareFiles";
import {DatabaseFactory} from "../util/DatabaseFactory";

export async function push(app: App, settings: MyPluginSettings, factory: DatabaseFactory) {
	const files = app.vault.getFiles();

	for (const file of files) {
		if (file.extension === 'md') {
			const documentId = file.path;

			// 检查云端是否存在该笔记
			const remoteDocument = await factory.getServer().getDocument(documentId);

			if (!remoteDocument) {
				console.log('cloud not found,开始上传');
				// 云端不存在，直接上传
				const content = await app.vault.read(file);
				await factory.getServer().upsertDocument({
					_id: documentId,
					content: content,
				});
			} else {
				// 云端存在，弹窗让用户处理冲突
				const localContent = await app.vault.read(file);
				const compareFile = new CompareFiles();

				if(remoteDocument.content!==localContent){
					await compareFile.showComparisonPopup(app, settings, file, localContent, remoteDocument);
				}

			}
		}
	}

	new Notice('全部笔记已推送完成!');
}
