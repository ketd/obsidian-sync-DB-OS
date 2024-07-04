/*
import swal from 'sweetalert';
import {App, Notice, TFile} from "obsidian";
import {MyPluginSettings} from "../setting/MyPluginSettings";
import {DatabaseFactory} from "./db/DatabaseFactory";
import {TencentOSServer} from "./os/TencentOSServer";
import {Util} from "./Util";


export class PopUps {

	showPdfConflict(file: TFile, app: App, settings: MyPluginSettings, factory: DatabaseFactory) {
		const util = new Util();
		const adapter = app.vault.adapter;
		const filepath = file.path;
		const tencentOSServer = new TencentOSServer(settings)


		swal("与云端文件内容对比", {
			buttons: {
				rename: {
					text: "重命名此pdf为副本，并且将此pdf上传至云端，同时下载云端同名pdf",
					value: "rename",
					className: "swal-button",
				},
				push: {
					text: "覆盖云端pdf",
					value: "push",
					className: "swal-button",
				},
			}
		})
			.then(async (value) => {
				switch (value) {

					case "rename":

						try {


						break;

					case "push":
						const server = await factory.getServer();
						const content = await app.vault.read(file);
						const hash = await util.computeSampleHash(content)
						await server.upsertDocument({
							_id: filepath,
							content: "",
							hash : hash
						})

						const arrayBuffer = await adapter.readBinary(filepath);

						// 将 ArrayBuffer 转换为 Blob，然后创建一个新的 File 对象
						const blob = new Blob([arrayBuffer], {type: 'application/pdf'});
						const newFile = new File([blob], file.name, {
							type: 'application/pdf',
							lastModified: new Date().getTime()
						});
						await tencentOSServer.deleteFileToOS(filepath).then(async r => {
							await tencentOSServer.uploadFileToOS(newFile, filepath).then(async r => {

							})
						}).catch(e => {

						}).finally(async () => {
						});
						new Notice('云端文件已被本地文件覆盖');
						break;

					/!*default:
						await swal("Got away safely!");*!/
				}
			});



















	}
}
*/
