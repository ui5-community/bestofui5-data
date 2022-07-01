// import { Octokit } from "@octokit/core";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
const MyOctokit = Octokit.plugin(throttling);
import * as jsdoc2md from "jsdoc-to-markdown";
import * as yaml from "js-yaml";
import { readFileSync, writeFileSync } from "fs";

import { ClonesJson, Contributor, IPackage, Jsdoc, JsdocType, Params, Source, SubPackage, UI5Yaml } from "./types";
import Package from "./Package";

export default class GitHubRepositoriesProvider {
	static source = "github-packages";
	static clonesJson: ClonesJson[] = [];

	static octokit = new MyOctokit({
		auth: process.env.GITHUB_TOKEN,
		throttle: {
			onRateLimit: (retryAfter: any, options: any) => {
				GitHubRepositoriesProvider.octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);

				// Retry four times after hitting a rate limit error, then give up
				if (options.request.retryCount <= 4) {
					console.log(`Retrying after ${retryAfter} seconds!`);
					return true;
				}
			},
			onAbuseLimit: (retryAfter: any, options: any) => {
				// does not retry, only logs a warning
				GitHubRepositoriesProvider.octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
			},
		},
	});

	static async get(sources: Source[]): Promise<IPackage[]> {
		const json = readFileSync(`${__dirname}/../data/clones.json`, { encoding: "utf8", flag: "r" });
		this.clonesJson = JSON.parse(json) as ClonesJson[];
		const packages: IPackage[] = [];
		let contributors: Contributor[] = [];

		for (const source of sources) {
			source.path = `${source.owner}/${source.repo}`;

			if (source.subpath && source.subpackages) {
				const repoInfo = await this.getRepoInfo(source);
				contributors = await this.fetchGitHubContributors(source, contributors);
				for (const subpackage of source.subpackages) {
					const path = `${source.subpath}/${subpackage.name}/`;
					console.log(`Fetching GitHub Data from ${source.owner}/${source.repo}/${source.subpath}/${subpackage.name}/`);
					const packageInfo = await this.fetchRepo(source, path, repoInfo, subpackage);

					if (packageInfo.type === "task" || packageInfo.type === "middleware" || packageInfo.type === "tooling") {
						try {
							packageInfo["jsdoc"] = await this.getJsdoc(source, path);
						} catch (error) {
							console.log(`Error while fetching jsdoc for ${source.path}`);
						}
					}

					packages.push(packageInfo);
				}
			} else {
				console.log(`Fetching GitHub Data from ${source.owner}/${source.repo}/`);
				const repoInfo = await this.getRepoInfo(source);
				const packageInfo = await this.fetchRepo(source, "", repoInfo, source);
				contributors = await this.fetchGitHubContributors(source, contributors);
				if (packageInfo.type === "task" || packageInfo.type === "middleware" || packageInfo.type === "tooling") {
					try {
						packageInfo["jsdoc"] = await this.getJsdoc(source, "");
					} catch (error) {
						console.log(`Error while fetching jsdoc for ${source.path}`);
					}
				}
				packages.push(packageInfo);
			}
		}
		writeFileSync(`${__dirname}/../data/clones.json`, JSON.stringify(this.clonesJson));
		writeFileSync(`${__dirname}/../data/contributors.json`, JSON.stringify(contributors));
		return packages;
	}

	static async getRepoInfo(source: Source): Promise<IPackage> {
		const packageObject: IPackage = new Package();
		const repo = await GitHubRepositoriesProvider.octokit.rest.repos.get({
			owner: source.owner,
			repo: source.repo,
		});
		packageObject.createdAt = repo.data.created_at;
		// generator don´t have a npm module, get updatedat from last commit
		if (source.type === "generator" || source.type === "application") {
			try {
				packageObject.updatedAt = await this.getLastCommitDate(source, repo.data.default_branch);
			} catch (error) {
				console.log("\x1b[31m%s\x1b[0m", `Error while fetching last commit date for ${source.path}`);
				packageObject.updatedAt = repo.data.updated_at;
			}
			try {
				await this.updateCloningStats(source);
			} catch (error) {
				console.log("\x1b[31m%s\x1b[0m", `Error while fetching cloning stats for ${source.path}`);
			}
		} else {
			packageObject.updatedAt = repo.data.updated_at;
		}

		packageObject.githublink = repo.data.html_url;
		packageObject.forks = repo.data.forks;
		packageObject.stars = repo.data.stargazers_count;
		packageObject.license = repo.data.license.key;
		packageObject.defaultBranch = repo.data.default_branch;
		return packageObject;
	}

	static async fetchRepo(source: Source, path: string, repoInfo: Package, sourcePackage: Source | SubPackage): Promise<IPackage> {
		let packageReturn: IPackage = new Package();
		try {
			const data = await GitHubRepositoriesProvider.octokit.rest.repos.getContent({
				mediaType: {
					format: "raw",
				},
				owner: source.owner,
				repo: source.repo,
				path: `${path}package.json`,
			});
			const string = data.data.toString();
			packageReturn = JSON.parse(string) as Package;
			packageReturn.type = sourcePackage.type;
			packageReturn.tags = sourcePackage.tags;
			packageReturn.gitHubOwner = source.owner;
			packageReturn.gitHubRepo = source.repo;
			packageReturn.license = repoInfo.license;
			packageReturn.licenseSource = sourcePackage.license;
			packageReturn.forks = repoInfo.forks;
			packageReturn.stars = repoInfo.stars;
			packageReturn.addedToBoUI5 = sourcePackage.addedToBoUI5;
			packageReturn.createdAt = repoInfo.createdAt;
			packageReturn.updatedAt = repoInfo.updatedAt;
			packageReturn.vscodeInstalls = -1;

			packageReturn.githublink = `${repoInfo.githublink}/tree/${repoInfo.defaultBranch}/${path}`;
			try {
				const readme = await GitHubRepositoriesProvider.octokit.rest.repos.getContent({
					mediaType: {
						format: "raw",
					},
					owner: source.owner,
					repo: source.repo,
					path: `${path}README.md`,
				});
				let readmeString = readme.data.toString();
				readmeString = readmeString.replace('<img src="', `<img src="https://raw.githubusercontent.com/${source.owner}/${source.repo}/${repoInfo.defaultBranch}/`);
				packageReturn.readme = readmeString;
			} catch (error) {
				console.log(`No README.mound for ${packageReturn.githublink}`);
			}
		} catch (error) {
			console.log(error);
		}

		return packageReturn;
	}

	static async fetchGitHubContributors(source: Source, contributorsArray: Contributor[]): Promise<Contributor[]> {
		const contributorsData = await GitHubRepositoriesProvider.octokit.rest.repos.listContributors({
			owner: source.owner,
			repo: source.repo,
		});
		const contributors = contributorsData.data.filter((contributor) => contributor.type === "User");
		// create contributors array
		for (const contributor of contributors) {
			const contributorsExists: Contributor = contributorsArray.find((contrObj) => contrObj.name === contributor.login);
			if (!contributorsExists) {
				const contrObj: Contributor = {
					name: contributor.login,
					contributions: contributor.contributions,
					avatar_url: contributor.avatar_url,
					url: contributor.html_url,
					packages: [source.repo],
					packagesFrontend: [`\n <a href='https://github.com/${source.owner}/${source.repo}' target='self'>${source.repo}</a>`],
				};
				contributorsArray.push(contrObj);
			} else {
				contributorsExists.contributions += contributor.contributions;
				contributorsExists.packages.push(source.repo);
				contributorsExists.packagesFrontend.push(`\n <a href='https://github.com/${source.owner}/${source.repo}' target='self'>${source.repo}</a>`);
			}
		}

		return contributorsArray;
	}

	static async getJsdoc(source: Source, path: string): Promise<Jsdoc> {
		let entryPath = "";
		const yamlArray = await this.parseYaml(source, path);
		const jsdoc: Jsdoc = {};
		for (const yaml of yamlArray) {
			if (yaml.type === "server-middleware") {
				yaml.type = "middleware";
				entryPath = yaml["middleware"].path;
			} else if (yaml.type === "task") {
				entryPath = yaml["task"].path;
			} else {
				continue;
			}

			const returnObject = await this.fetchParams(source, path, entryPath);
			if (returnObject && returnObject.params && returnObject.markdown) {
				if (yaml.type === "middleware") {
					jsdoc.middleware = {
						params: returnObject.params,
						markdown: returnObject.markdown,
					};
				} else if (yaml.type === "task") {
					jsdoc.task = {
						params: returnObject.params,
						markdown: returnObject.markdown,
					};
				}
			}
		}
		return jsdoc;
	}

	static async parseYaml(source: Source, path: string): Promise<UI5Yaml[]> {
		const yamlArray: UI5Yaml[] = [];
		try {
			const indexJs = await GitHubRepositoriesProvider.octokit.rest.repos.getContent({
				mediaType: {
					format: "raw",
				},
				owner: source.owner,
				repo: source.repo,
				path: `${path}ui5.yaml`,
			});
			const indexString = indexJs.data.toString();
			const yamlStringArray = indexString.split("---");
			for (const yamlString of yamlStringArray) {
				if (yamlString.length > 0) {
					const yamlObject = yaml.load(yamlString) as UI5Yaml;
					yamlArray.push(yamlObject);
				}
			}
			return yamlArray;
		} catch (error) {
			console.log(error);
		}
	}

	static async fetchParams(source: Source, path: string, entryPath: string): Promise<JsdocType> {
		const returnObject: JsdocType = {
			params: undefined,
			markdown: "",
		};
		const arr: Params[] = [];

		try {
			const indexJs = await GitHubRepositoriesProvider.octokit.rest.repos.getContent({
				mediaType: {
					format: "raw",
				},
				owner: source.owner,
				repo: source.repo,
				path: `${path}${entryPath}`,
			});
			const indexString = indexJs.data.toString();
			const opt: jsdoc2md.JsdocOptions = {
				source: indexString,
				files: undefined,
			};
			const markdown = await jsdoc2md.render(opt);
			const data = await jsdoc2md.getTemplateData(opt);
			const typedef: any[] = data.filter((x: any) => x.kind === "typedef");
			if (typedef.length > 0) {
				const yoTypeRegex = /(?<=<)(.*?)(?=>)/;
				typedef[0].properties.forEach((property: any) => {
					const param: Params = {
						type: "",
						description: "",
						name: "",
						default: "",
					};
					const yoType = yoTypeRegex.test(property.type.names.find((name: string) => name.includes("yo")))
						? yoTypeRegex.exec(property.type.names.find((name: string) => name.includes("yo")))[0].split(":")
						: ["input"];
					param.name = property.name as string;
					const descripArray = property.description.split("=>");
					param.description = descripArray[0] as string;
					param.default = yoType?.[1] || "";
					param.type = yoType[0];

					param["env"] = descripArray?.[1]?.replace(/(.*)env:/, "") as string;
					arr.push(param);
				});
				returnObject.params = arr;
			}
			returnObject.markdown = markdown;
			return returnObject;
		} catch (error) {
			console.log("\x1b[31m%s\x1b[0m", `Could not fetch file for jsdoc ${source.owner}/${source.repo}/${path}${entryPath}`);
		}
	}

	static async getLastCommitDate(source: Source, defaultBranch: string): Promise<string> {
		const defaultBranchReference = await GitHubRepositoriesProvider.octokit.rest.git.getRef({
			owner: source.owner,
			repo: source.repo,
			ref: `heads/${defaultBranch}`,
		});
		const latestCommit = await GitHubRepositoriesProvider.octokit.rest.git.getCommit({
			owner: source.owner,
			repo: source.repo,
			commit_sha: defaultBranchReference.data.object.sha,
		});

		return latestCommit.data.committer.date;
	}

	static async updateCloningStats(source: Source): Promise<void> {
		const clonesRawData = await GitHubRepositoriesProvider.octokit.rest.repos.getClones({
			owner: source.owner,
			repo: source.repo,
		});
		let clonesGithubData: ClonesJson = clonesRawData.data as ClonesJson;
		let cloneHistory = this.clonesJson.filter((clone: any) => clone.name === source.repo);
		if (cloneHistory.length === 0) {
			clonesGithubData.name = source.repo;
			this.clonesJson.push(clonesGithubData);
		} else {
			for (const cloneDate of clonesGithubData.clones) {
				// find objects with same timestamp in clones.data
				const newCloneDate = cloneHistory[0].clones.filter((clone: any) => clone.timestamp === cloneDate.timestamp);
				if (newCloneDate.length === 0) {
					cloneHistory[0].clones.push(cloneDate);
				}
			}
		}
	}
}
