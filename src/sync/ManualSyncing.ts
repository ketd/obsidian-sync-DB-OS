import {App, Notice, TFile} from "obsidian";
import {MyPluginSettings} from "../setting/MyPluginSettings";
import {MongoDBServer} from "../util/MongoDBServer";
import {CompareFiles} from "../util/CompareFiles";
import {DatabaseFactory} from "../util/DatabaseFactory";

export async function manualSyncing(env: MouseEvent, app: App, settings: MyPluginSettings, factory: DatabaseFactory) {

	const activeFile = app.workspace.getActiveFile();
	if (activeFile instanceof TFile) {
		try {

			const fileContent = await app.vault.read(activeFile);
			const result = await factory.getServer().getDocument(activeFile.path);
			if (result) {
				if (fileContent !== result.content) {
					console.log(`本地内容和云内容不同:${activeFile.path}`);
					// 你可以在这里添加你的逻辑，比如提示用户同步差异，或者自动同步

					const compareFile = new CompareFiles()
					await compareFile.showComparisonPopup(this.app, settings, activeFile, fileContent, result);
				} else {
					console.log(`本地内容和云内容相同:${activeFile.path}`);
					new Notice('本地内容和云内容相同:${activeFile.path}');
				}
				new Notice('手动同步成功!');
			}


		} catch (error) {
			new Notice('手动同步失败: ' + error.message);
		}
	} else {
		new Notice('没有活动文件可以同步');
	}

}
