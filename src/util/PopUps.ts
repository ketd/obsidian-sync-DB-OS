import Swal from 'sweetalert2';
import {App, TFile} from "obsidian";
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
		Swal.fire({
			title: filepath.replace(/.*\//, '') + '与云端同名文档不一致，请选择操作',
			showDenyButton: true,
			showCancelButton: false,
			confirmButtonText: '重命名此pdf为副本，并且将此pdf上传至云端，同时下载云端同名pdf',
			denyButtonText: '覆盖云端pdf',
			customClass: {
				actions: 'my-actions',
				cancelButton: 'order-1 right-gap',
				confirmButton: 'order-2',
				denyButton: 'order-3',
			},
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {

					tencentOSServer.downFileToOS(filepath+ '_副本.pdf').then(async r => {


						await util.SaveFileToLocally(app, filepath, r)


						adapter.rename(filepath, filepath + '_副本.pdf').then(r => {
							Swal.fire('Saved!', '', 'success').then(r => {
							})
						})
					}).catch(e => {

					}).finally(async () => {

					})


				} catch (e) {
					console.log(e)
				}

			} else if (result.isDenied) {
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
						Swal.fire('Changes are not saved', '', 'info').then(r => {
						})
					})
				}).catch(e => {

				}).finally(async () => {
				});


			}
		})
	}
}
