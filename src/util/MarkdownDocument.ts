export default class MarkdownDocument {
	constructor(
		public _id: string,
		public content: string,
		public hash: string,
		public fileType?: string,
		public _rev?: string
	) {
	}
}
