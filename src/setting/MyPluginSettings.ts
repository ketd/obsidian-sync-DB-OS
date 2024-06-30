import {PluginSettingTab, Setting, Notice, App} from 'obsidian';

export interface MyPluginSettings {
	//替换默认插入，直接使用图传
	ReplacesTheDefaultInsert: boolean;
	ObjectStorageProvider: string;
	// 插件设置
	//腾讯云
	SecretIdByTencent: string;
	SecretKeyByTencent: string;
	BucketByTencent: string;
	RegionByTencent: string;
	//阿里云
	SecretIdByAliyun: string;
	SecretKeyByAliyun: string;
    BucketByAliyun: string;
    RegionByAliyun: string;
    //是否保存到本地
	IsSaveLocally: boolean;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	ReplacesTheDefaultInsert: true,
	ObjectStorageProvider: 'tencent',
	SecretIdByTencent: '',
	SecretKeyByTencent: '',
	BucketByTencent: '',
	RegionByTencent: '',
	SecretIdByAliyun: '',
    SecretKeyByAliyun: '',
    BucketByAliyun: '',
    RegionByAliyun: '',
	IsSaveLocally: true
}




export class SampleSettingTab extends PluginSettingTab {
	plugin: any;
	inputElements: HTMLInputElement[] = []; // 用于存储特定输入元素的引用


	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl("h1", {text: "同步插件配置"});

		containerEl.createEl("h1", {text: ""});


		containerEl.createEl("h2", {text: "默认插入配置"});
		// 是否保存到本地设置项
		new Setting(containerEl)
			.setName('替换默认插入，直接使用图床')
			.setDesc('此选项将拦截默认粘贴插入图片，直接使用对象存储作为图床,需确保对象存储可用')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.ReplacesTheDefaultInsert)
					.onChange(async (value) => {
						this.plugin.settings.ReplacesTheDefaultInsert = value;
					});
			});

		containerEl.createEl("h2", {text: "对象存储配置"});

		// 对象存储服务商选择项
		new Setting(containerEl)
			.setName('选择对象存储服务商')
			.setDesc('选择你购买的对象存储服务提供商,比如阿里云，腾讯云等')
			.addDropdown(dropdown => {
				dropdown
					.addOption('tencent', '腾讯云')
					.addOption('aliyun', '阿里云')
					.setValue(this.plugin.settings.ObjectStorageProvider)
					.onChange(async (value) => {
						this.plugin.settings.ObjectStorageProvider = value;
						this.display(); // 重新加载设置面板
					});
			});

		// 根据选择的服务商显示不同的配置
		this.displayProviderSettings(containerEl);


		let isEdit = false;
		// 保存/修改设置按钮
		const editButtonSetting = new Setting(containerEl)
			.addButton(button => {
				button
					.setButtonText('修改')
					.onClick(async () => {
						isEdit = !isEdit;
						if (isEdit) {
							// 启用所有输入框和切换
							this.inputElements.forEach(input => input.disabled = false);
							button.setButtonText('保存');
						} else {
							// 保存设置并禁用所有输入框和切换
							await this.plugin.saveSettings();
							this.inputElements.forEach(input => input.disabled = true);
							button.setButtonText('修改');
							new Notice('保存成功');
						}
					});
			});

		containerEl.createEl("h2", {text: "其他配置"});
		// 是否保存到本地设置项
		new Setting(containerEl)
			.setName('是否保存到本地')
			.setDesc('此选项会设置插入图片是否保存到本地备份，别担心文件名与云端文件同名')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.IsSaveLocally)
					.onChange(async (value) => {
						this.plugin.settings.IsSaveLocally = value;
					});
			});


	}

	displayProviderSettings(containerEl: HTMLElement): void {
		if (this.plugin.settings.ObjectStorageProvider === 'tencent') {
			this.displayTencentSettings(containerEl);
		} else if (this.plugin.settings.ObjectStorageProvider === 'aliyun') {
			this.displayAliyunSettings(containerEl);
		}
	}

	displayTencentSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "腾讯云COS对象存储配置" });
		const remark = containerEl.createEl("div", { cls: "remark" });

		remark.createEl("div", { text: "如何获取", cls: "remark__title" });
		remark.createEl("small", {
			text: "SECRETID 和 SECRETKEY 请登录 https://console.cloud.tencent.com/cam/capi 进行查看和管理",
			cls: "book__author"
		});

		remark.createEl("p", {
			text: "需要对跨域访问CORS进行设置",
			cls: "book__author"
		});

		remark.createEl("p", {
			text: "其中Expose-Headers需要添加以下四项",
			cls: "book__author"
		});
		const list = remark.createEl("ul", { cls: "remark__list" });
		list.createEl("li", { text: "ETag", cls: "remark__item" });
		list.createEl("li", { text: "Content-Length", cls: "remark__item" });
		list.createEl("li", { text: "x-cos-request-id", cls: "remark__item" });
		list.createEl("li", { text: "Content-Disposition", cls: "remark__item" });

		remark.createEl("small", {
			text: "类似于这种效果",
			cls: "remark__author"
		});

		// 获取插件根目录
		const pluginDir = this.plugin.manifest.dir;
		remark.createEl("img", {
			attr: { src:  `${pluginDir}src/assets/CORSImg.png`, alt: "本地图片" },
			cls: "local-image",
		});

		remark.createEl("small", {
			text: "如果不知道如何设置，请参考 https://cloud.tencent.com/document/product/436/13318",
			cls: "remark__author"
		});



		// SecretId 设置项
		new Setting(containerEl)
			.setName('SecretId')
			.addText(text => {
				text
					.setPlaceholder('Enter your SecretId')
					.setValue(this.plugin.settings.SecretIdByTencent)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.SecretIdByTencent = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});

		// SecretKey 设置项
		new Setting(containerEl)
			.setName('SecretKey')
			.addText(text => {
				text
					.setPlaceholder('Enter your SecretKey')
					.setValue(this.plugin.settings.SecretKeyByTencent)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.SecretKeyByTencent = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});

		// Bucket 设置项
		new Setting(containerEl)
			.setName('Bucket')
			.setDesc('填入您自己的存储桶')
			.addText(text => {
				text
					.setPlaceholder('填入您自己的存储桶')
					.setValue(this.plugin.settings.BucketByTencent)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.BucketByTencent = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});

		// Region 设置项
		new Setting(containerEl)
			.setName('Region')
			.setDesc('存储桶所在地域，例如ap-beijing，必须字段')
			.addText(text => {
				text
					.setPlaceholder('存储桶所在地域，例如ap-beijing，必须字段')
					.setValue(this.plugin.settings.RegionByTencent)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.RegionByTencent = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});
	}

	displayAliyunSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "阿里云OSS对象存储配置" });
		const remark = containerEl.createEl("div", { cls: "remark" });
		remark.createEl("div", { text: "如何获取", cls: "remark__title" });
		remark.createEl("small", {
			text: "AccessKeyID 和 AccessKeySecret 请登录 https://usercenter.console.aliyun.com/ 进行查看和管理",
			cls: "remark__author"
		});







		// AccessKeyID 设置项
		new Setting(containerEl)
			.setName('AccessKeyID')
			.addText(text => {
				text
					.setPlaceholder('Enter your AccessKeyID')
					.setValue(this.plugin.settings.SecretIdByAliyun)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.SecretIdByAliyun = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});

		// AccessKeySecret 设置项
		new Setting(containerEl)
			.setName('AccessKeySecret')
			.addText(text => {
				text
					.setPlaceholder('Enter your AccessKeySecret')
					.setValue(this.plugin.settings.SecretKeyByAliyun)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.SecretKeyByAliyun = value;
					});
				this.inputElements.push(text.inputEl); // 存储输入元素的引用
			});
	}
}


