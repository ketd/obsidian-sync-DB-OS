import {App, Notice, TFile} from 'obsidian';
import {DatabaseFactory} from "../util/db/DatabaseFactory";
import {TencentOSServer} from "../util/os/TencentOSServer";
import {Util} from "../util/Util";


export async function pull(app: App, factory: DatabaseFactory,tencentOSServer:TencentOSServer) {
	const server = await factory.getServer();
	const allDocumentIds = await server.getAllDocumentIds();
	console.log(allDocumentIds);
	const util =new Util();

	for (const id of allDocumentIds) {
		const file = app.vault.getAbstractFileByPath(id);
		if (!file) {
			// Obsidian 中不存在此文件，获取文档内容并创建相应的笔记
			const document = await server.getDocument(id);
			if (document?.fileType === 'pdf') {
				await tencentOSServer.downFileToOS(document._id).then(async (res) => {
					await util.SaveFileToLocally(app, document._id, res)
				});
			} else if (document) {
				const filePath = document._id;
				const fileContent = document.content;

				// 解析并创建文件夹
				const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));

				try {
					await util.createFolderIfNotExists(app, folderPath);
				}catch (e){
				}

				// 创建文件
				await app.vault.create(filePath, fileContent);
			}
		}/*else{
			// Obsidian 中存在此文件，获取文档内容并更新相应的笔记
            const document = await server.getDocument(id);
            if (document?.fileType === 'pdf') {
                await tencentOSServer.downFileToOS(document._id).then(async (res) => {
                    await util.SaveFileToLocally(app, document._id, res)

                });
            } else if (document&&file instanceof TFile) {

				await app.vault.modify(file, document.content);

            }
		}*/
	}
	new Notice('拉取云端成功!');
}

