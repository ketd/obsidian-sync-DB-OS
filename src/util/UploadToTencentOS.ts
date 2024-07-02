import COS from 'cos-js-sdk-v5';
import { MyPluginSettings } from '../setting/MyPluginSettings';

export async function uploadToTencentOS(file: File, fileExtension: string, settings: MyPluginSettings): Promise<string> {
	return new Promise(async (resolve, reject) => {
		const cos = new COS({
			SecretId: settings.SecretIdByTencent,
			SecretKey: settings.SecretKeyByTencent,
		});

		cos.uploadFile({
			Bucket: settings.BucketByTencent,/* 填入您自己的存储桶，必须字段 */
			Region: settings.RegionByTencent,/* 存储桶所在地域，例如ap-beijing，必须字段 */
			Key: fileExtension, /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
			Body: file,/* 必须，上传文件对象，可以是input[type="file"]标签选择本地文件后得到的file对象 */
			SliceSize: 1024 * 1024 * 100,/* 触发分块上传的阈值，超过100MB使用分块上传，非必须 */
			onTaskReady: (taskId) => { /* 非必须 */
				console.log(taskId);
			},
			onProgress: (progressData) => { /* 非必须 */
				console.log(JSON.stringify(progressData));
			},
			onFileFinish: (err, data, options) => {/* 非必须 */
				console.log(options.Key + '上传' + (err ? '失败' : '完成'));
			},
			// 支持自定义headers 非必须
			Headers: {
				'Content-Disposition': 'inline'
			},
		}, (err, data) => {
			if (err) {
				reject(err);
			} else {
				console.log(data);
				resolve('https://'+data.Location);
			}
		});
	});
}
