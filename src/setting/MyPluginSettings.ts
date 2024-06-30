import {PluginSettingTab, Setting, Notice, App} from 'obsidian';
import {CouchDBServer} from "../util/CouchDBServer";
import {MongoDBServer} from "../util/MongoDBServer";

export interface MyPluginSettings {
	//替换默认插入，直接使用图传
	ReplacesTheDefaultInsert: boolean;
	ObjectStorageProvider: string;
	DataBase: string;
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

	//CouchDB
	URLByCouchDB: string;
	USerNameByCouchDB: string;
	PasswordByCouchDB: string;
	DateBaseNameByCouchDB: string;

	//MongoDB
	IsUpdateDoc:boolean;

	URLByMongoDB: string;
	PortByMongoDB: string;
	USerNameByMongoDB: string;
	PasswordByMongoDB: string;
	DateBaseNameByMongoDB: string;
	CollectionName:string;
	Throttling:number;
	SyncInterval:number;

	//是否保存到本地
	IsSaveLocally: boolean;


}

export const DEFAULT_SETTINGS: MyPluginSettings = {

	ReplacesTheDefaultInsert: false,
	ObjectStorageProvider: 'tencent',
	DataBase:'MongoDB',
	SecretIdByTencent: '',
	SecretKeyByTencent: '',
	BucketByTencent: '',
	RegionByTencent: '',
	SecretIdByAliyun: '',
	SecretKeyByAliyun: '',
	BucketByAliyun: '',
	RegionByAliyun: '',

	URLByCouchDB: '',
	USerNameByCouchDB: '',
	PasswordByCouchDB: '',
	DateBaseNameByCouchDB: '',

	IsUpdateDoc:false,

	URLByMongoDB: '',
	PortByMongoDB: '27017',
    USerNameByMongoDB: '',
    PasswordByMongoDB: '',
    DateBaseNameByMongoDB: '',
	CollectionName:'',
	Throttling:5,
	SyncInterval: 300, // 默认同步间隔为 300 秒 (5 分钟)

	IsSaveLocally: true,

}


export class SampleSettingTab extends PluginSettingTab {
	plugin: any;
	inputOSElements: HTMLInputElement[] = []; // 用于存储特定输入元素的引用
	inputDBElements: HTMLInputElement[] = []; // 用于存储特定输入元素的引用


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



		new Setting(containerEl)
			.setName('是否上传笔记到云端数据库')
			.setDesc('是否上传笔记到云端数据库')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.IsUpdateDoc)
					.onChange(async (value) => {
						this.plugin.settings.IsUpdateDoc = value;
						this.display(); // 重新加载设置面板
					});
			});

		if(this.plugin.settings.IsUpdateDoc){
			containerEl.createEl("h1", {text: "数据库配置"});
			// 对象存储服务商选择项
			new Setting(containerEl)
				.setName('选择数据库')
				.setDesc('目前仅支持MongoDB')
				.addDropdown(dropdown => {
					dropdown
						.addOption('MongoDB', 'MongoDB')
						.addOption('CouchDB', 'CouchDB')
						.setValue(this.plugin.settings.DataBase)
						.onChange(async (value) => {
							this.plugin.settings.DataBase = value;
							this.display(); // 重新加载设置面板
						});
				});


			this.displayDBSettings(containerEl)

			new Setting(containerEl)
				.setName('定时同步时间间隔')
				.setDesc('每隔'+this.plugin.settings.SyncInterval+'秒同步一次')
				.addDropdown(dropdown => dropdown
					.addOption('100', '100 秒')
					.addOption('300', '300 秒')
					.addOption('600', '600 秒')
					.setValue(String(this.plugin.settings.SyncInterval))
					.onChange(async (value) => {
						const parsedValue = parseInt(value, 10);
						if (!isNaN(parsedValue)) {
							this.plugin.settings.SyncInterval = parsedValue;
							await this.plugin.saveSettings();
						} else {
							// 如果发生无效的选择，可以做出相应提示或处理
							new Notice('无效的选择');
							// 恢复为当前设置的值
							dropdown.setValue(String(this.plugin.settings.SyncInterval));
						}
					}));


			new Setting(containerEl)
				.setName('节流时间间隔')
				.setDesc('选择修改后触发同步的时间间隔，默认为5秒')
				.addDropdown(dropdown => dropdown
					.addOption('5', '5 秒')
					.addOption('10', '10 秒')
					.addOption('30', '30 秒')
					.addOption('60', '60 秒')
					.addOption('300', '300 秒')
					.setValue(String(this.plugin.settings.ThrottlingInterval))
					.onChange(async (value) => {
						const parsedValue = parseInt(value, 10);
						if (!isNaN(parsedValue)) {
							this.plugin.settings.ThrottlingInterval = parsedValue;
							await this.plugin.saveSettings();
						} else {
							// 如果发生无效的选择，可以做出相应提示或处理
							new Notice('无效的选择');
							// 恢复为当前设置的值
							dropdown.setValue(String(this.plugin.settings.ThrottlingInterval));
						}
					}));

		}

		new Setting(containerEl)
			.setName('替换默认插入，直接使用图床')
			.setDesc('此选项将拦截默认粘贴插入图片，直接使用对象存储作为图床,需确保对象存储可用')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.ReplacesTheDefaultInsert)
					.onChange(async (value) => {
						this.plugin.settings.ReplacesTheDefaultInsert = value;
						this.display(); // 重新加载设置面板
					});
			});

		if(this.plugin.settings.ReplacesTheDefaultInsert){
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



		}



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


	displayDBSettings( containerEl: HTMLElement): void {
		if (this.plugin.settings.DataBase === 'MongoDB') {
			this.displayMongoDBSettings(containerEl);
		} else if (this.plugin.settings.DataBase === 'CouchDB') {
			this.displayCouchDBSettings(containerEl);
		}
	}

	displayMongoDBSettings(containerEl: HTMLElement): void {

		const mongoDBServer = new MongoDBServer(this.plugin.settings);
		containerEl.createEl("h3", {text: "MongoDB配置"});

		// URL 设置项
		new Setting(containerEl)
			.setName('主机')

			.addText(text => {
				text
					.setPlaceholder('输入数据库地址')
					.setValue(this.plugin.settings.URLByMongoDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.URLByMongoDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			})


		// URL 设置项
		new Setting(containerEl)
			.setName('端口')
			.setDesc('默认为27017')
			.addText(text => {
				text
					.setPlaceholder('请输入端口')
					.setValue(this.plugin.settings.PortByMongoDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.PortByMongoDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// USerName 设置项
		new Setting(containerEl)
			.setName('USerName')
			.addText(text => {
				text
					.setPlaceholder('输入数据库用户名')
					.setValue(this.plugin.settings.USerNameByMongoDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.USerNameByMongoDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// Password 设置项
		new Setting(containerEl)
			.setName('Password')
			.addText(text => {
				text
					.setPlaceholder('输入密码')
					.setValue(this.plugin.settings.PasswordByMongoDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.PasswordByMongoDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// DateBaseName 设置项
		new Setting(containerEl)
			.setName('数据库名')
			.addText(text => {
				text
					.setPlaceholder('数据库名')
					.setValue(this.plugin.settings.DateBaseNameByMongoDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.DateBaseNameByMongoDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// DateBaseName 设置项
		new Setting(containerEl)
			.setName('集合名')
			.addText(text => {
				text
					.setPlaceholder('集合名')
					.setValue(this.plugin.settings.CollectionName)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.CollectionName = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

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
							this.inputDBElements.forEach(input => input.disabled = false);
							button.setButtonText('保存');
						} else {
							// 保存设置并禁用所有输入框和切换
							await this.plugin.saveSettings();
							this.inputDBElements.forEach(input => input.disabled = true);
							button.setButtonText('修改');
							new Notice('保存成功');
						}
					});
			});

		new Setting(containerEl)
			.addButton(button => {
				button
					.setButtonText('测试连接')
					.onClick(async () => {
						await mongoDBServer.testConnection()
					});
			});
	}
	displayCouchDBSettings(containerEl: HTMLElement): void {

		const couchDBServer =  new CouchDBServer(this.plugin.settings);

		containerEl.createEl("h3", {text: "CouchDB配置"});

		// URL 设置项
		new Setting(containerEl)
			.setName('URL')
			.addText(text => {
				text
					.setPlaceholder('输入数据库地址')
					.setValue(this.plugin.settings.URLByCouchDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.URLByCouchDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// USerName 设置项
		new Setting(containerEl)
			.setName('USerName')
			.addText(text => {
				text
					.setPlaceholder('输入数据库用户名')
					.setValue(this.plugin.settings.USerNameByCouchDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.USerNameByCouchDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// Password 设置项
		new Setting(containerEl)
			.setName('Password')
			.addText(text => {
				text
					.setPlaceholder('输入密码')
					.setValue(this.plugin.settings.PasswordByCouchDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.PasswordByCouchDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

		// DateBaseName 设置项
		new Setting(containerEl)
			.setName('数据库名')
			.addText(text => {
				text
					.setPlaceholder('数据库名')
					.setValue(this.plugin.settings.DateBaseNameByCouchDB)
					.setDisabled(true)
					.onChange(async (value) => {
						this.plugin.settings.DateBaseNameByCouchDB = value;
					});
				this.inputDBElements.push(text.inputEl); // 存储输入元素的引用
			});

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
							this.inputDBElements.forEach(input => input.disabled = false);
							button.setButtonText('保存');
						} else {
							// 保存设置并禁用所有输入框和切换
							await this.plugin.saveSettings();
							this.inputDBElements.forEach(input => input.disabled = true);
							button.setButtonText('修改');
							new Notice('保存成功');
						}
					});
			});

		new Setting(containerEl)
			.addButton(button => {
				button
					.setButtonText('测试连接')
					.onClick(async () => {

						await couchDBServer.testConnection().then(res => {})
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
		containerEl.createEl("h3", {text: "腾讯云COS对象存储配置"});
		const remark = containerEl.createEl("div", {cls: "remark"});

		remark.createEl("div", {text: "如何获取", cls: "remark__title"});
		remark.createEl("small", {
			text: "SECRETID 和 SECRETKEY 请登录 https://console.cloud.tencent.com/cam/capi 进行查看和管理",
			cls: "book__author"
		});

		// 在 remark 容器中创建表格
		const table = remark.createEl("table", {cls: "storage-config-table"});

		// 创建表头
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		const headers = ["来源 Origin", "操作 Methods", "Allow-Headers", "Expose-Headers", "超时 Max-Age", "Vary"];
		headers.forEach(headerText => {
			const th = headerRow.createEl("th");
			th.textContent = headerText;
		});

		// 创建表体
		const tbody = table.createEl("tbody");
		const data = [
			["*", "PUT\nGET\nPOST\nDELETE\nHEAD", "*", "ETag\nContent-Length\nx-cos-request-id\nContent-Disposition", "0", "已启用"]
		];
		data.forEach(rowData => {
			const tr = tbody.createEl("tr");
			rowData.forEach(cellData => {
				const td = tr.createEl("td");
				td.textContent = cellData;
			});
		});

		// 添加样式
		const style = document.createElement('style');
		style.textContent = `
            .storage-config-table {
                width: 100%;
                
            }
            .storage-config-table th{
            	font-size: 16px;       
                text-align: left;
                border-collapse: collapse;
            }
            .storage-config-table td {
            	font-size: 14px;
                text-align: left;
            }       
        `;
		document.head.appendChild(style);

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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
			});


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
							this.inputOSElements.forEach(input => input.disabled = false);
							button.setButtonText('保存');
						} else {
							// 保存设置并禁用所有输入框和切换
							await this.plugin.saveSettings();
							this.inputOSElements.forEach(input => input.disabled = true);
							button.setButtonText('修改');
							new Notice('保存成功');
						}
					});
			});


	}

	displayAliyunSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", {text: "阿里云OSS对象存储配置"});
		const remark = containerEl.createEl("div", {cls: "remark"});
		remark.createEl("div", {text: "如何获取", cls: "remark__title"});
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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
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
				this.inputOSElements.push(text.inputEl); // 存储输入元素的引用
			});
	}
}


