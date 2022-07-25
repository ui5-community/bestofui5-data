import { Contributor, IPackage, PackageDownloadsHistory } from "./types";

export default class Package implements IPackage {
	sourceType: string;
	subPath?: string;
	liveDemoUrl: string;
	vscodeInstalls: number;
	[x: string]: any;
	vscodelink: string;
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
	downloads365: number;
	downloadsCurrentMonth: number;
	downloadsCurrentFortnight: number;
	downloadsFortnightGrowth: number;
	gitHubOwner: string;
	gitHubRepo: string;
	defaultBranch: string;
	downloadsHistory?: PackageDownloadsHistory[];
	versions?: any;
	gitHubContributors?: Contributor[];
}
