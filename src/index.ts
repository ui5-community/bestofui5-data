/* eslint-disable @typescript-eslint/no-floating-promises */
// require("dotenv").config();
import { readFileSync, writeFileSync } from "fs";

import GitHubRepositoriesProvider from "./gh-repos";
import NPMProvider from "./npm";
import { IPackage, Source, Tags, DataJson, NPMVersions, Contributor } from "./types";

// TEST

(async () => {
	const dataJson: DataJson = {
		packages: [],
		tags: [],
	};

	const sourcesJsonString = readFileSync(`${__dirname}/../sources.json`, "utf8");
	const sources: Source[] = JSON.parse(sourcesJsonString);

	let githubPackages: IPackage[] = await GitHubRepositoriesProvider.get(sources);
	githubPackages = await NPMProvider.get(githubPackages);

	// extract tags from packages info
	const typesArray: Tags[] = [];
	const tagsArray: Tags[] = [];
	const versionsArray: any[] = [];
	const contributorsArray: any[] = [];
	for (const packageContent of githubPackages) {
		const typeExists: Tags = typesArray.find((typeObj) => typeObj.name === packageContent.type);
		if (!typeExists) {
			const typeObj: Tags = {
				name: packageContent.type,
				count: 1,
				type: "type",
			};
			typesArray.push(typeObj);
		} else {
			typeExists.count += 1;
		}
		for (const tag of packageContent.tags) {
			const tagExists: Tags = tagsArray.find((tagObj) => tagObj.name === tag);
			if (!tagExists) {
				const tagObj: Tags = {
					name: tag,
					count: 1,
					type: "tag",
				};
				tagsArray.push(tagObj);
			} else {
				tagExists.count += 1;
			}
		}
		// create verions array
		if (packageContent.versions) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			for (const version of packageContent.versions) {
				if (version.version !== "created" && version.version !== "modified") {
					const versionObject = {
						name: packageContent.name,
						version: version.version,
						date: version.date,
					};
					versionsArray.push(versionObject);
				}
			}
		}
		// create contributors array
		for (const contributor of packageContent.gitHubContributors) {
			const contributorsExists: Contributor = contributorsArray.find((contrObj) => contrObj.name === contributor.name);
			if (!contributorsExists) {
				const contrObj: Contributor = {
					name: contributor.name,
					contributions: contributor.contributions,
					avatar_url: contributor.avatar_url,
					url: contributor.url,
					packages: [packageContent.name],
				};
				contributorsArray.push(contrObj);
			} else {
				contributorsExists.contributions += contributor.contributions;
				contributorsExists.packages.push(packageContent.name);
			}
		}
	}

	dataJson.packages = githubPackages;
	dataJson.tags = typesArray.concat(tagsArray);

	writeFileSync(`${__dirname}/../data/data.json`, JSON.stringify(dataJson));
	writeFileSync(`${__dirname}/../data/versions.json`, JSON.stringify(versionsArray));
	writeFileSync(`${__dirname}/../data/contributors.json`, JSON.stringify(contributorsArray));
})();
