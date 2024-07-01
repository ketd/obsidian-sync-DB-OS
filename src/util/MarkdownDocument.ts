export default class MarkdownDocument {
	constructor(
		public _id: string,
		public content: string,
		public _rev?: string
	) {
	}
}
