import { IPackage } from "./types";
import axios from "axios";
import { parse } from "node-html-parser";

export default class VSCProvider {
	static async get(packages: IPackage[]): Promise<IPackage[]> {
		let vscodeExtensions = packages.filter((p) => p.type === "vscode");
		for (let i = 0; i < vscodeExtensions.length; i++) {
			let vscodeExtension = vscodeExtensions[i];
			vscodeExtension.vscodelink = `https://marketplace.visualstudio.com/items?itemName=${vscodeExtension.publisher}.${vscodeExtension.name}`;

			// get raw html page and installs
			let res = await axios(`https://marketplace.visualstudio.com/items?itemName=${vscodeExtension.publisher}.${vscodeExtension.name}`);
			const vscodeHTMLParsed = parse(res.data);
			try {
				vscodeExtension.installs = vscodeHTMLParsed.querySelector(".installs-text").innerText.replace("installs", "").replace(",", "").trim();
			} catch (error) {
				console.log(`Erorr on VSCode ${vscodeExtension.publisher}.${vscodeExtension.name}: Not found installs`);
			}

			// get marketplace data
			await this.getDataMarketplaceAPI(vscodeExtension);
		}
		return packages;
	}

	static async getDataMarketplaceAPI(vsCodePackage: IPackage): Promise<void> {
		const data = {
			assetTypes: "",
			filters: [
				{ criteria: [{ filterType: 7, value: `${vsCodePackage.publisher}.${vsCodePackage.name}` }], direction: 2, pageSize: 100, pageNumber: 1, sortBy: 0, sortOrder: 0, pagingToken: "" },
			],
			flags: 2151,
		};
		const dataString = JSON.stringify(data);
		// send post request with axios and json data
		let res = await axios.post("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", dataString, {
			headers: {
				"Content-Type": "application/json",
				accept: "*/*;api-version=7.1-preview.1;excludeUrls=true",
			},
		});
		// get the data from the response
		let dataResponse = res.data.results[0].extensions[0];

		let versions = [];
		for (const version of dataResponse.versions) {
			let versionObject = {
				version: version.version,
				date: version.lastUpdated,
				link: `https://marketplace.visualstudio.com/items/${vsCodePackage.publisher}.${vsCodePackage.name}/changelog`,
			};
			versions.push(versionObject);
		}

		vsCodePackage.versions = versions;
		vsCodePackage.createdAt = dataResponse.releaseDate;
		vsCodePackage.updatedAt = dataResponse.lastUpdated;
	}
}
