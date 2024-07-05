import { App, TFile, Notice } from 'obsidian';
import { MongoDBServer } from '../util/db/MongoDBServer';

import {CompareFiles} from "../util/CompareFiles";
import {DatabaseFactory} from "../util/db/DatabaseFactory";
import CryptoJS from "crypto-js";
import {TencentOSServer} from "../util/os/TencentOSServer";
import {Util} from "../util/Util";
import {MultiSelectModal} from "../modal/MultiSelectModal";
import {syncDbOsPluginSettings} from "../setting/SettingsData";

export async function push(app: App, settings: syncDbOsPluginSettings, factory: DatabaseFactory, statusBarItem: HTMLElement) {
	const files = app.vault.getFiles();
	const server = await factory.getServer();
	const util = new Util()


	let isUpdatedFiles: TFile[] = [];
	const markdownDocumentHash = await server.getAllDocumentHash();
	const markdownDocumentIds = await  server.getAllDocumentIds()
	for (const file of files) {
		if(file.extension == 'md'){
			const content = await app.vault.read(file);
			const hash = await util.computeSampleHash(content);
			const markdownDocument = markdownDocumentHash.find(doc => doc.hash === hash);
			if(!markdownDocument){
				isUpdatedFiles.push(file);
			}
		}

	}

	let selectedFiles: TFile[] = [];

	new MultiSelectModal(
		this.app,
		"您对以下内容做出了修改",
		isUpdatedFiles,
		(result) => {
			selectedFiles=result
		},
		{
			text: '确认推送', onClick: async () => {
				try{
					for(const file of selectedFiles){

						const content = await app.vault.read(file);
						const hash = await util.computeSampleHash(content);
						await server.upsertDocument({
							_id: file.path,
							content: content,
							hash: hash
						});
					}
					new Notice('全部笔记已推送完成!');
				}catch (e) {
					new Notice('笔记推送失败!!!'+e);
				}

			}
		},
		{
			text: '取消', onClick: async () => {

			}
		}
	).open()

	/*for (const file of files) {
		if (file.extension === 'md') {
			const documentId = file.path;

			// 检查云端是否存在该笔记
			const remoteDocument = await server.getDocument(documentId);

			if (!remoteDocument) {
				//console.log('cloud not found,开始上传');
				// 云端不存在，直接上传
				const content = await app.vault.read(file);
				const hash = await util.computeSampleHash(content);
				await server.upsertDocument({
					_id: documentId,
					content: content,
					hash: hash
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
					hash:hash
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
				//console.error('Error upserting document:', error);
				// Handle error if needed
			}
		}
	}*/


}
