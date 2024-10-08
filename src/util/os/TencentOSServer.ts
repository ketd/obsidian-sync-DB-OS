import COS from 'cos-js-sdk-v5';
import {syncDbOsPluginSettings} from "../../setting/SettingsData";


export class TencentOSServer {
	private cos: COS;

	constructor(private settings: syncDbOsPluginSettings) {
		this.cos = new COS({
			SecretId: this.settings.SecretIdByTencent,
			SecretKey: this.settings.SecretKeyByTencent,
		});
	}

	public async uploadFileToOS(file: File, filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const fileName = filePath.replace(/.*\//, '');
			this.cos.uploadFile({
				Bucket: this.settings.BucketByTencent,/* 填入您自己的存储桶，必须字段 */
				Region: this.settings.RegionByTencent,/* 存储桶所在地域，例如ap-beijing，必须字段 */
				Key: fileName, /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
				Body: file,/* 必须，上传文件对象，可以是input[type="file"]标签选择本地文件后得到的file对象 */
				SliceSize: 1024 * 1024 * 100,/* 触发分块上传的阈值，超过100MB使用分块上传，非必须 */
				onTaskReady: (taskId) => { /* 非必须 */
					//console.log(taskId);
				},
				onProgress: (progressData) => { /* 非必须 */
					//console.log(JSON.stringify(progressData));
				},
				onFileFinish: (err, data, options) => {/* 非必须 */
					//console.log(options.Key + '上传' + (err ? '失败' : '完成'));
				},
				// 支持自定义headers 非必须
				Headers: {
					'Content-Disposition': 'inline'
				},
			}, (err, data) => {
				if (err) {
					reject(err);
				} else {
					//console.log(data);
					resolve('https://' + data.Location);
				}
			});
		});
	}

	public async downFileToOS(filePath: string): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			//将xxx/xxx/xxx.pdf截取为xxx.dpf
			const fileName = filePath.replace(/.*\//, ''); // 使用正则表达式匹配最后一个斜杠及其前面的内容，并替换为空字符串
			this.cos.getObject({
				Bucket: this.settings.BucketByTencent,/* 填入您自己的存储桶，必须字段 */
				Region: this.settings.RegionByTencent,/* 存储桶所在地域，例如ap-beijing，必须字段 */
				Key: fileName,              /* 必须 */
				DataType: 'arraybuffer',        /* 非必须 */
				onProgress: function (progressData) {
				//	console.log(JSON.stringify(progressData));
				}
			}, function (err, data) {
				if (err) {
                    reject(err);
                } else {
					resolve(data.Body as ArrayBuffer);
                }
            });
        });
    }

	public async deleteFileToOS(filePath: string): Promise<void> {
		this.cos.deleteObject({
			Bucket: this.settings.BucketByTencent,/* 填入您自己的存储桶，必须字段 */
			Region: this.settings.RegionByTencent,/* 存储桶所在地域，例如ap-beijing，必须字段 */
			Key: filePath,              /* 必须 */
		}, function(err, data) {
			//console.log(err || data);
		});
	}


}
