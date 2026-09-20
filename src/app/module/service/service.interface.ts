export interface servicePayload {
	name: string;
	description: string;
	price: string;
}

export interface IQuery {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortOrder?: string;
	sortBy?: string;
	// any others filter fields can be added here
	[key: string]: unknown;
}
