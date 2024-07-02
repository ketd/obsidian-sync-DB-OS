import { App, Notice, TFile } from 'obsidian';
import Swal from 'sweetalert2';
import { MyPluginSettings } from '../setting/MyPluginSettings';
import { DatabaseFactory } from "./DatabaseFactory";
import MarkdownDocument from "./MarkdownDocument";

export class CompareFiles {
	async showComparisonPopup(app: App, settings: MyPluginSettings, file: TFile, localContent: string, cloudResult: MarkdownDocument) {
		const diff = require('diff');

		const diffResult = diff.diffLines(localContent, cloudResult.content);

		let comparisonHTML = '<div style="display: flex;">';
		comparisonHTML += '<div style="width: 50%; padding-right: 10px;"><h3>本地文件</h3>';
		comparisonHTML += '<div style="background-color: lightgrey; padding: 10px;">';

		diffResult.forEach((part: any) => {
			const color = part.added ? 'green' : part.removed ? 'red' : 'black';
			comparisonHTML += `<div style="color: ${color};">${part.value}</div>`;
		});

		comparisonHTML += '</div></div>';
		comparisonHTML += '<div style="width: 50%; padding-left: 10px;"><h3>云端文件</h3>';
		comparisonHTML += '<div style="background-color: lightgrey; padding: 10px;">';

		// Only show non-removed parts in cloud file
		diffResult.forEach((part: any) => {
			const color = part.added ? 'green' : part.removed ? 'red' : 'black';
			if (!part.removed) {
				comparisonHTML += `<div style="color: ${color};">${part.value}</div>`;
			}
		});

		comparisonHTML += '</div></div></div>';

		return new Promise<void>((resolve, reject) => {
			Swal.fire({
				title: '文件内容对比',
				html: comparisonHTML,
				width: '80%',
				showCloseButton: true,
				showCancelButton: true,
				cancelButtonText: '拉取云端文件',
				confirmButtonText: '使用本地文件覆盖云端',
			}).then(async (result) => {
				if (result.isConfirmed) {
					// Use local file to overwrite cloud
					const factory = new DatabaseFactory(settings);
					await (await factory.getServer()).upsertDocument({
						_id: file.path,
						content: localContent,
						_rev: cloudResult._rev // Assuming this is retrieved from cloud
					});
					new Notice('云端文件已被本地文件覆盖');
				} else if (result.dismiss === Swal.DismissReason.cancel) {
					// Pull cloud file to local
					await app.vault.modify(file, cloudResult.content);
					new Notice('本地文件已被云端文件覆盖');
				}
				resolve();
			}).catch(err => {
				console.error('Error showing comparison popup:', err);
				reject(err);
			});
		});
	}
}
