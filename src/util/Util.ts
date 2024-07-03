import {App, Notice, TFile} from "obsidian";
import CryptoJS from "crypto-js";
import {MyPluginSettings} from "../setting/MyPluginSettings";
import {TencentOSServer} from "./os/TencentOSServer";
import {Snowflake} from "./Snowflake";

export class Util {


	async SaveFileToLocally(app: App, filePath: string, fileContent: ArrayBuffer) {

		// 保存文件
		const adapter = app.vault.adapter;
		if (adapter && adapter.writeBinary) {
			const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
			// 解析并创建文件夹
			try {
				await this.createFolderIfNotExists(app, folderPath)
			} catch (e) {

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

	async saveImageLocally(app: App, fileName: string, file: File, subfoldersName: string, currentFilePath: string) {
		const arrayBuffer = await file.arrayBuffer();

		// 获取当前文件夹路径
		const folderPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));

		// 构造子文件夹路径
		const subFolderPath = `${folderPath}/${subfoldersName}`;

		// 创建子文件夹（如果不存在）
		if (!await app.vault.adapter.exists(subFolderPath)) {
			await app.vault.createFolder(subFolderPath);
		}

		// 构造图片的完整路径
		const imagePath = `${subFolderPath}/${fileName}`;

		// 保存图片
		await app.vault.createBinary(imagePath, arrayBuffer);
	}


	// 创建文件夹，如果不存在
	async createFolderIfNotExists(app: App, folderPath: string) {
		const folder = app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			const parentFolder = folderPath.substring(0, folderPath.lastIndexOf('/'));
			if (parentFolder) {
				await this.createFolderIfNotExists(app, parentFolder);
			}
			await app.vault.createFolder(folderPath);
		}
	}

	async computeSampleHash(content: string): Promise<string> {
		const sampleSize = 1024 * 1024; // 1MB
		const sample = content.slice(0, sampleSize);
		return CryptoJS.SHA1(sample).toString(CryptoJS.enc.Hex);
	}

	async replaceLocalImagesWithCloudUrls(activeFile:TFile,app: App, settings: MyPluginSettings, tencentOSServer: TencentOSServer): Promise<boolean> {

		/*const files = app.vault.getFiles();
		for (const file of files) {*/
			const content = await app.vault.read(activeFile);
			// 匹配 ![[...]] 和 ![](...) 格式的图片链接
			const imageLinkPattern = /!\[\[([^\]]+?)\]\]|!\[.*?\]\((.+?)\)/g;
			let match;
			let newContent = content;
			const snowflake = new Snowflake(BigInt(1), BigInt(1));
			const files = app.vault.getFiles();

			// 使用一个 Set 来存储所有处理过的图片路径，避免重复处理
			const processedImages = new Set<string>();

			// 逐个匹配图片链接并处理
			while ((match = imageLinkPattern.exec(content)) !== null) {
				let imagePath = match[1] || match[2]; // 尝试获取图片路径
				if (!imagePath) {
					continue; // 如果路径为空，跳过本次循环
				}


				let imageFile = null;
				for (let file of files) {
					// 处理完整路径，支持嵌套文件夹
					if (app.vault.getAbstractFileByPath(imagePath) instanceof TFile) {
						imageFile = app.vault.getAbstractFileByPath(imagePath);
						console.log(`Image found: ${file.path}`);
						break;
					} else if (file.name === imagePath.replace(/.*\//, '')) {
						imageFile = file;
						console.log(`Image found by name: ${file.path}`);
						break;
					}
				}

				if (imageFile instanceof TFile && !processedImages.has(imageFile.path)) {
					processedImages.add(imageFile.path);
					try {
						const fileName = snowflake.nextId() + '.' + imageFile.extension;

						// 获取原始文件的路径
						const originalPath = imageFile.path;

						// 构造新的文件路径，保留原始路径但使用新的文件名
						const newPath = originalPath.replace(/[^/]+$/, fileName);

						// 复制并重命名本地文件到新路径
						await app.vault.rename(imageFile, newPath);
						// 上传图片到云端
						const arrayBuffer = await app.vault.readBinary(imageFile);
						const blob = new Blob([arrayBuffer]);
						const newFile = new File([blob], fileName);
						const imageUrl = await tencentOSServer.uploadFileToOS(newFile, fileName);


						// 替换链接
						newContent = newContent.replace(match[0], `![${fileName}](${imageUrl})`);
					} catch (error) {
						new Notice(`上传图片失败：${imageFile.path}`);
						console.error(error);
					}
				} else if (!imageFile) {
					new Notice(`本地图片不存在：${imagePath}`);
				}
			}


		if (newContent !== content) {
			await app.vault.modify(activeFile, newContent);

			new Notice('图片链接已更新为云端地址');
			return true;
		} else {
			new Notice('未找到需要替换的图片链接');
			return false;
		}
	}

	/*async replaceLocalImagesWithCloudUrls(file: TFile,app: App,settings: MyPluginSettings,tencentOSServer:TencentOSServer) {
		const content = await app.vault.read(file);
		const imageLinkPattern = /!\[\[([^\]]+?)\]\]/g;
		let match;
		let newContent = content;

		// 使用一个 Set 来存储所有处理过的图片路径，避免重复处理
		const processedImages = new Set<string>();

		while ((match = imageLinkPattern.exec(content)) !== null) {
			const imagePath = match[1];
			const absoluteImagePath = app.vault.adapter.getResourcePath(imagePath);
			const imageFile = app.vault.getAbstractFileByPath(absoluteImagePath);

			console.log(absoluteImagePath)
			if (imageFile instanceof TFile) {
				try {

					const fileName = snowflake.nextId() + '.' + imageFile.extension;
					// 上传图片到云端
					const arrayBuffer = await app.vault.readBinary(imageFile);
					const blob = new Blob([arrayBuffer]);
					const file = new File([blob], fileName);
					const imageUrl = await tencentOSServer.uploadFileToOS(file,fileName);

					// 替换链接
					newContent = newContent.replace(match[0], `![${fileName}](${imageUrl})`);
				} catch (error) {
					new Notice(`上传图片失败：${imageFile.path}`);
					console.error(error);
				}
			} else {
				new Notice(`本地图片不存在：${imagePath}`);
			}
		}

		if (newContent !== content) {
			await app.vault.modify(file, newContent);
			new Notice('图片链接已更新为云端地址');
		} else {
			new Notice('未找到需要替换的图片链接');
		}
	}*/
}
