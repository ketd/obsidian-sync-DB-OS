import {App} from "obsidian";
import CryptoJS from "crypto-js";

export class Util{



	 async SaveFileToLocally(app: App, filePath: string, fileContent: ArrayBuffer) {

		// 保存文件
		const adapter = app.vault.adapter;
		if (adapter && adapter.writeBinary) {
			const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
			// 解析并创建文件夹
			try {
				await this.createFolderIfNotExists(app, folderPath)
			}catch (e) {

			}

			// 构建完整文件路径
			const completeFilePath = `${folderPath}/${filePath.substring(filePath.lastIndexOf('/') + 1)}`;
			try {
				await adapter.writeBinary(completeFilePath, fileContent);
				console.log("PDF文件保存成功");
			} catch (e) {
				console.log("保存PDF文件时发生错误:", e);
			}
		} else {
			console.log("当前环境不支持直接文件写入");
		}
	}

	// 创建文件夹，如果不存在
	async  createFolderIfNotExists(app: App, folderPath: string) {
		const folder = app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			const parentFolder = folderPath.substring(0, folderPath.lastIndexOf('/'));
			if (parentFolder) {
				await this.createFolderIfNotExists(app, parentFolder);
			}
			await app.vault.createFolder(folderPath);
		}
	}

	async  computeSampleHash(content: string): Promise<string> {
		const sampleSize = 1024 * 1024; // 1MB
		const sample = content.slice(0, sampleSize);
		return CryptoJS.SHA1(sample).toString(CryptoJS.enc.Hex);
	}

}
