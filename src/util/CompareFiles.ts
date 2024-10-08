import { App, Notice, TFile } from 'obsidian';
import "styles.css";
import { DatabaseFactory } from "./db/DatabaseFactory";
import MarkdownDocument from "./MarkdownDocument";
import { Util } from "./Util";
import { ConfirmModal } from "../modal/ConfirmModal";
import { syncDbOsPluginSettings } from "../setting/SettingsData";
import {diffLines} from 'diff';

export class CompareFiles {
	async showComparisonPopup(app: App, settings: syncDbOsPluginSettings, file: TFile, localContent: string, cloudResult: MarkdownDocument) {
		const diff = require('diff');
		const util = new Util();

		const diffResult = diffLines(localContent, cloudResult.content);

		const comparisonContainer = document.createElement('div');
		comparisonContainer.addClass('comparison-container');

		const localFileDiv = document.createElement('div');
		localFileDiv.addClass('local-file-div');

		const localFileHeader = document.createElement('h3');
		localFileHeader.textContent = '本地文件';
		localFileDiv.appendChild(localFileHeader);

		const localFileContent = document.createElement('div');
		localFileContent.addClass('local-file-content');

		diffResult.forEach((part: any) => {
			const partDiv = document.createElement('div');
			if (part.added) {
				partDiv.addClass('diff-added');
			} else if (part.removed) {
				partDiv.addClass('diff-removed');
			} else {
				partDiv.addClass('diff-unchanged');
			}
			partDiv.textContent = part.value;
			localFileContent.appendChild(partDiv);
		});

		localFileDiv.appendChild(localFileContent);
		comparisonContainer.appendChild(localFileDiv);

		const cloudFileDiv = document.createElement('div');
		cloudFileDiv.addClass('cloud-file-div');

		const cloudFileHeader = document.createElement('h3');
		cloudFileHeader.textContent = '云端文件';
		cloudFileDiv.appendChild(cloudFileHeader);

		const cloudFileContent = document.createElement('div');
		cloudFileContent.addClass('cloud-file-content');

		diffResult.forEach((part: any) => {
			if (!part.removed) {
				const partDiv = document.createElement('div');
				if (part.added) {
					partDiv.addClass('diff-added');
				} else {
					partDiv.addClass('diff-unchanged');
				}
				partDiv.textContent = part.value;
				cloudFileContent.appendChild(partDiv);
			}
		});

		cloudFileDiv.appendChild(cloudFileContent);
		comparisonContainer.appendChild(cloudFileDiv);

		new ConfirmModal(
			app,
			'与云端文件内容对比',
			comparisonContainer, // Pass the constructed DOM element instead of HTML string
			true,
			{
				text: '拉取云端', onClick: async () => {
					await app.vault.modify(file, cloudResult.content);
					new Notice('本地文件已被云端文件覆盖');
				}
			},
			{
				text: '覆盖云端', onClick: async () => {
					const factory = new DatabaseFactory(settings);
					const hash = await util.computeSampleHash(localContent);
					await (await factory.getServer()).upsertDocument({
						_id: file.path,
						content: localContent,
						hash: hash
					});
					new Notice('云端文件已被本地文件覆盖');
				}
			},
		).open();
	}
}
