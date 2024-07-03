import { App, Notice, TFile } from 'obsidian';
import swal from 'sweetalert';
import { MyPluginSettings } from '../setting/MyPluginSettings';
import { DatabaseFactory } from "./db/DatabaseFactory";
import MarkdownDocument from "./MarkdownDocument";
import { Util } from "./Util";

export class CompareFiles {
	async showComparisonPopup(app: App, settings: MyPluginSettings, file: TFile, localContent: string, cloudResult: MarkdownDocument) {
		const diff = require('diff');
		const util = new Util();

		const diffResult = diff.diffLines(localContent, cloudResult.content);

		let comparisonHTML = '<div style="display: flex;">';
		comparisonHTML += '<div style="width: 50%; padding-right: 10px;"><h3>本地文件</h3>';
		comparisonHTML += '<div style="padding: 10px;">';

		diffResult.forEach((part: any) => {
			const color = part.added ? 'green' : part.removed ? 'red' : 'black';
			comparisonHTML += `<div style="color: ${color};">${part.value}</div>`;
		});

		comparisonHTML += '</div></div>';
		comparisonHTML += '<div style="width: 50%; padding-left: 10px;"><h3>云端文件</h3>';
		comparisonHTML += '<div style="padding: 10px;">';

		// Only show non-removed parts in cloud file
		diffResult.forEach((part: any) => {
			const color = part.added ? 'green' : part.removed ? 'red' : 'black';
			if (!part.removed) {
				comparisonHTML += `<div style="color: ${color};">${part.value}</div>`;
			}
		});

		comparisonHTML += '</div></div></div>';

		return new Promise<void>((resolve, reject) => {
			swal("与云端文件内容对比", {
				content: {
					element: 'div',
					attributes: {
						innerHTML: comparisonHTML
					}
				},
				buttons: {
					pull: {
						text: "拉取云端文件",
						value: "pull",
						className: "swal-button",
					},
					push: {
						text: "使用本地文件覆盖云端",
						value: "push",
						className: "swal-button",
					},
				}
			})
				.then(async (value) => {
					switch (value) {

						case "pull":

							await app.vault.modify(file, cloudResult.content);
							new Notice('本地文件已被云端文件覆盖');
							break;

						case "push":
							const factory = new DatabaseFactory(settings);
							const hash = await util.computeSampleHash(localContent);
							await (await factory.getServer()).upsertDocument({
								_id: file.path,
								content: localContent,
								hash: hash
							});
							new Notice('云端文件已被本地文件覆盖');
							break;

						/*default:
							await swal("Got away safely!");*/
					}
				});
			/*swal({
				title: '文件内容对比',
				content: {
					element: 'div',
					attributes: {
						innerHTML: comparisonHTML
					}
				},
				buttons: {
					cancel: {
						text: '拉取云端文件',
						value: 'pull'
					},
					confirm: {
						text: '使用本地文件覆盖云端',
						value: 'useLocal'
					}
				}
			}).then(async (value) => {
				if (value === 'useLocal') {
					// Use local file to overwrite cloud
					const factory = new DatabaseFactory(settings);
					const hash = await util.computeSampleHash(localContent);
					await (await factory.getServer()).upsertDocument({
						_id: file.path,
						content: localContent,
						hash: hash
					});
					new Notice('云端文件已被本地文件覆盖');
				} else if (value === 'pull') {
					// Pull cloud file to local
					await app.vault.modify(file, cloudResult.content);
					new Notice('本地文件已被云端文件覆盖');
				}
				resolve();
			}).catch(err => {
				console.error('Error showing comparison popup:', err);
				reject(err);
			});*/
		});
	}
}
