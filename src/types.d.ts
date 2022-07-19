enum BoUI5Types {
	library = "library",
	task = "task",
	middleware = "middleware",
	tooling = "tooling",
	customControl = "customControl",
	module = "module",
	generator = "generator",
	vscode = "vscode",
	application = "application",
}

enum License {
	beerware = "beer-ware",
	apache2 = "apache-2.0",
	mit = "mit",
}

export interface Ranking {
	id: string;
	name: string;
	description: string;
	link: string;
	tags: string[];
	score: number;
	rank: number;
	pastRank?: number;
	updatedAt: string;
	createdAt?: string;
	type: string;
}

export interface TrendsFile {
	overall: Ranking[];
	recentlyUpdated: Ranking[];
	newlyAdded: Ranking[];
}

export interface IPackage {
	[x: string]: any;
	name: string;
	description: string;
	author: string;
	license: string;
	licenseSource: string;
	main?: string;
	jsdoc?: any;
	type: string;
	tags: string[];
	readme: string;
	forks: number;
	stars: number;
	updatedAt: string;
	createdAt: string;
	addedToBoUI5: string;
	githublink: string;
	npmlink: string;
	vscodelink: string;
	vscodeInstalls: number;
	downloads365: number;
	downloadsCurrentMonth: number;
	downloadsCurrentFortnight: number;
	downloadsFortnightGrowth: number;
	gitHubOwner: string;
	gitHubRepo: string;
	defaultBranch: string;
	downloadsHistory?: PackageDownloadsHistory[];
	versions?: NPMVersions[];
	gitHubContributors?: Contributor[];
	subPath?: string;
	liveDemoUrl: string;
}

export interface Tags {
	name: string;
	count: number;
	type: string;
}

export interface Source {
	path: string;
	owner: string;
	repo: string;
	subpath?: string;
	addedToBoUI5: string;
	subpackages?: SubPackage[];
	type: BoUI5Types;
	tags: string[];
	license: License;
	liveDemoUrl: string;
}

export interface SubPackage {
	name: string;
	addedToBoUI5: string;
	type: BoUI5Types;
	tags: string[];
	license: License;
}

export interface DataJson {
	packages: IPackage[];
	tags: Tags[];
}

export interface Jsdoc {
	middleware?: JsdocType;
	task?: JsdocType;
}

export interface JsdocType {
	markdown: string;
	params: Params[];
}

export interface Params {
	type: string;
	description: string;
	name: string;
	default?: string | boolean;
	env?: string;
}

export interface UI5Yaml {
	specVersion: string;
	kind: string;
	type: string;
	metadata: {
		name: string;
	};
	middleware?: {
		path: string;
	};
	task?: {
		path: string;
	};
}

export interface NPMDownloads {
	downloads: number;
	start: string;
	end: string;
	package: string;
}

export interface PackageDownloadsHistory {
	yearMonth: string;
	downloads: number;
}
export interface NPMDownloadsHistory {
	downloads: NPMDownloadsHistoryDownloads[];
	start: string;
	end: string;
	package: string;
}

export interface NPMDownloadsHistoryDownloads {
	downloads: number;
	day: string;
}

export interface NPMVersions {
	date: string;
	version: string;
	link: string;
	changelog: string;
}

export interface ClonesJson {
	name: string;
	count: number;
	uniques: number;
	clones: {
		timestamp: string;
		count: number;
		uniques: number;
	}[];
}

export interface Contributor {
	name: string;
	contributions: number;
	avatar_url: string;
	url: string;
	packages: string[];
	packagesFrontend: string[];
}
