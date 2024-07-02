import { App, TFile, Notice } from 'obsidian';
import { MongoDBServer } from '../util/MongoDBServer';

import { MyPluginSettings } from '../setting/MyPluginSettings';
import {CompareFiles} from "../util/CompareFiles";
import {DatabaseFactory} from "../util/DatabaseFactory";
import CryptoJS from "crypto-js";
import {TencentOSServer} from "../util/TencentOSServer";
import {Util} from "../util/Util";

export async function push(app: App, settings: MyPluginSettings, factory: DatabaseFactory) {
	const files = app.vault.getFiles();
	const server = await factory.getServer();
	const util = new Util()

	for (const file of files) {
		if (file.extension === 'md') {
			const documentId = file.path;

			// 检查云端是否存在该笔记
			const remoteDocument = await server.getDocument(documentId);

			if (!remoteDocument) {
				console.log('cloud not found,开始上传');
				// 云端不存在，直接上传
				const content = await app.vault.read(file);
				await server.upsertDocument({
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
		}else if(file.extension === 'pdf'){
			try {
				const tencentOSServer=new TencentOSServer(settings)
				// 读取文件内容
				const content = await this.app.vault.read(file);
				// 计算文件哈希值（SHA-1）
				const hash = await util.computeSampleHash(content);

				const success=await server.upsertDocument({
					_id: file.path,
					content:hash,
					fileType: "pdf",
				});

				if(success){

					// 创建 File 对象
					// 读取文件内容为 ArrayBuffer
					const adapter = this.app.vault.adapter;
					const arrayBuffer = await adapter.readBinary(file.path);

					// 将 ArrayBuffer 转换为 Blob，然后创建一个新的 File 对象
					const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
					const newFile = new File([blob], file.name, { type: 'application/pdf', lastModified: new Date().getTime() });
					await tencentOSServer.uploadFileToOS(newFile, file.path);
				}

			} catch (error) {
				console.error('Error upserting document:', error);
				// Handle error if needed
			}
		}
	}

	new Notice('全部笔记已推送完成!');
}
