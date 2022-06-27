/* eslint-disable @typescript-eslint/no-floating-promises */
// require("dotenv").config();
import { readFileSync, writeFileSync } from "fs";

import GitHubRepositoriesProvider from "./gh-repos";
import NPMProvider from "./npm";
import VSCProvider from "./vsc";
import { IPackage, Source, Tags, DataJson } from "./types";

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
	githubPackages = await VSCProvider.get(githubPackages);

	// extract tags from packages info
	const typesArray: Tags[] = [];
	const tagsArray: Tags[] = [];
	const versionsArray: any[] = [];
	const licenseArray: any[] = [];
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
		const licenseExists: Tags = licenseArray.find((typeObj) => typeObj.name === packageContent.licenseSource);
		if (!licenseExists) {
			const licenseObj: Tags = {
				name: packageContent.licenseSource,
				count: 1,
				type: "license",
			};
			licenseArray.push(licenseObj);
		} else {
			licenseExists.count += 1;
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
	}

	dataJson.packages = githubPackages;
	dataJson.tags = typesArray.concat(tagsArray).concat(licenseArray);

	writeFileSync(`${__dirname}/../data/data.json`, JSON.stringify(dataJson));
	writeFileSync(`${__dirname}/../data/versions.json`, JSON.stringify(versionsArray));
})();
