export interface syncDbOsPluginSettings {
	//替换默认插入，直接使用图传
	ReplacesTheDefaultInsert: boolean;
	ObjectStorageProvider: string;
	DatabaseType: string;
	// 插件设置
	//腾讯云
	SecretIdByTencent: string;
	SecretKeyByTencent: string;
	BucketByTencent: string;
	RegionByTencent: string;
	//阿里云
	AccessKeyIdByAliyun: string;
	AccessKeySecretByAliyun: string;
	BucketByAliyun: string;
	RegionByAliyun: string;


	//DB
	IsUpdateDoc:boolean;
	IsAutoSave:boolean
	AutomaticallyUploadedOnCreation:boolean;

	//CouchDB
	URLByCouchDB: string;
	PortByCouchDB: string;
	USerNameByCouchDB: string;
	PasswordByCouchDB: string;
	DateBaseNameByCouchDB: string;

	//MongoDB
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
	IsCreateSubfolders :boolean
	SubfoldersName:string

	//其他设置
	//NeverDeleteLocal


}

export const DEFAULT_SETTINGS: syncDbOsPluginSettings = {

	ReplacesTheDefaultInsert: false,
	ObjectStorageProvider: 'tencent',
	DatabaseType:'CouchDB',
	SecretIdByTencent: '',
	SecretKeyByTencent: '',
	BucketByTencent: '',
	RegionByTencent: '',
	AccessKeyIdByAliyun: '',
	AccessKeySecretByAliyun: '',
	BucketByAliyun: '',
	RegionByAliyun: '',


	IsUpdateDoc:false,
	IsAutoSave:false,
	AutomaticallyUploadedOnCreation:false,


	URLByCouchDB: '',
	PortByCouchDB:'5984',
	USerNameByCouchDB: '',
	PasswordByCouchDB: '',
	DateBaseNameByCouchDB: '',



	URLByMongoDB: '',
	PortByMongoDB: '27017',
	USerNameByMongoDB: '',
	PasswordByMongoDB: '',
	DateBaseNameByMongoDB: '',
	CollectionName:'',
	Throttling:300,
	SyncInterval: 300, // 默认同步间隔为 300 秒 (5 分钟)

	IsSaveLocally: true,
	IsCreateSubfolders:true,
	SubfoldersName:'img'

}
