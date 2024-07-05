import {App, Notice, TFile} from "obsidian";
import {MongoDBServer} from "../util/db/MongoDBServer";
import {CompareFiles} from "../util/CompareFiles";
import {DatabaseFactory} from "../util/db/DatabaseFactory";
import MarkdownDocument from "../util/MarkdownDocument";
import {Util} from "../util/Util";
import {MyPluginSettings} from "../setting/SettingsData";

export async function manualSyncing(env: MouseEvent, app: App, settings: MyPluginSettings, factory: DatabaseFactory) {
	try {
		const util = new Util()
		const server = await factory.getServer();
		const files = app.vault.getFiles();
		const allDocumentIds = await server.getAllDocumentIds();
		//console.log("allDocumentIds"+allDocumentIds);
		const markdownDocumentHash = await server.getAllDocumentHash();

		for (const file of files) {
			if (file.extension === 'md') {


				const content = await app.vault.read(file);
				const hash = await util.computeSampleHash(content);
				const markdownDocument = markdownDocumentHash.find(doc => doc.hash === hash);
				//没有或者不相同
				if (!markdownDocument) {
					const cloudResult = await server.getDocument(file.path);
					//console.log("cloudResult"+cloudResult);
					if (cloudResult!==null) {
						//console.log(`本地内容和云内容不同:${file.path}`);
						// 你可以在这里添加你的逻辑，比如提示用户同步差异，或者自动同步
						const compareFile = new CompareFiles()


						await compareFile.showComparisonPopup(this.app, settings, file, await app.vault.read(file), cloudResult);
					} else {
						//没有
						//console.log(`云端不存在，你还没有上传:${file.path}`);
						new Notice('云端不存在，你还没有上传:' + file.path);
					}

				} else {
					//console.log(`本地内容和云内容相同:${file.path}`);
					new Notice('本地内容和云内容相同:' + file.path);
				}
			}
		}
	} catch (error) {
		new Notice('手动同步失败: ' + error.message);
	}


}
