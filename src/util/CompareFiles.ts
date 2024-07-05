import { App, Notice, TFile } from 'obsidian';
import swal from 'sweetalert';
import { DatabaseFactory } from "./db/DatabaseFactory";
import MarkdownDocument from "./MarkdownDocument";
import { Util } from "./Util";
import { ConfirmModal } from "../modal/ConfirmModal";
import { syncDbOsPluginSettings } from "../setting/SettingsData";

export class CompareFiles {
	async showComparisonPopup(app: App, settings: syncDbOsPluginSettings, file: TFile, localContent: string, cloudResult: MarkdownDocument) {
		const diff = require('diff');
		const util = new Util();

		const diffResult = diff.diffLines(localContent, cloudResult.content);

		const comparisonContainer = document.createElement('div');
		comparisonContainer.style.display = 'flex';
		comparisonContainer.style.width = '100%'; // Ensure the container takes up the full width

		const localFileDiv = document.createElement('div');
		localFileDiv.style.flex = '1'; // Use flex to allow the divs to grow and shrink within the container
		localFileDiv.style.paddingRight = '10px';

		const localFileHeader = document.createElement('h3');
		localFileHeader.textContent = '本地文件';
		localFileDiv.appendChild(localFileHeader);

		const localFileContent = document.createElement('div');
		localFileContent.style.padding = '10px';

		diffResult.forEach((part: any) => {
			const color = part.added ? 'green' : part.removed ? 'red' : 'black';
			const partDiv = document.createElement('div');
			partDiv.style.color = color;
			partDiv.textContent = part.value;
			localFileContent.appendChild(partDiv);
		});

		localFileDiv.appendChild(localFileContent);
		comparisonContainer.appendChild(localFileDiv);

		const cloudFileDiv = document.createElement('div');
		cloudFileDiv.style.flex = '1'; // Use flex to allow the divs to grow and shrink within the container
		cloudFileDiv.style.paddingLeft = '10px';

		const cloudFileHeader = document.createElement('h3');
		cloudFileHeader.textContent = '云端文件';
		cloudFileDiv.appendChild(cloudFileHeader);

		const cloudFileContent = document.createElement('div');
		cloudFileContent.style.padding = '10px';

		// Only show non-removed parts in cloud file
		diffResult.forEach((part: any) => {
			if (!part.removed) {
				const color = part.added ? 'green' : 'black';
				const partDiv = document.createElement('div');
				partDiv.style.color = color;
				partDiv.textContent = part.value;
				cloudFileContent.appendChild(partDiv);
			}
		});

		cloudFileDiv.appendChild(cloudFileContent);
		comparisonContainer.appendChild(cloudFileDiv);

		new ConfirmModal(
			app,
			'与云端文件内容对比',
			comparisonContainer.outerHTML, // Use outerHTML for passing constructed HTML
			1200,
			800,
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
