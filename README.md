# Best of UI5 Data

"Best of UI5" is the new entry page for the ui5-community.  
This repository will crawl and supply the data for the website.

## Add your package

Just create a [issue with this template in the `bestofui5-data repo`](https://github.com/ui5-community/bestofui5-data/issues/new?assignees=marianfoo&labels=new%20package&template=new_package.md&title=Add%20new%20Package:) with your package and just check if you meet the prerequisites.  

## Description

The crawler is written in Typescript and will get the latest data every day with a GitHub action worklow.  
It will look at every package defined in the [`sources.json`](https://github.com/ui5-community/bestofui5-data/blob/main/sources.json) file.
Currently it´s looking at data from GitHub and NPM.  
If you´re looking for the latest data files, they are in the `live-data` branch and in the [`data`](https://github.com/ui5-community/bestofui5-data/tree/live-data/data) folder.  

# Technical

## General

The source code is written in typescript and in the [`src`](https://github.com/ui5-community/bestofui5-data/tree/main/src) folder.  
The workflow is will run every day with a GitHub action and triggers the `build` command in the `package.json` file.  
Data is collected via GitHub and NPM APIs. For GitHub only the authenticated access makes sense because the API rate limit is 60 requests per hour.  
It will collect metadata from GitHub and NPM, Readme and Historic Downloads.  

## index.ts

Index.ts is the initial file for all following processes.  
It starts to read the `sources.json` file to determine which packages have to be read.
Since the file is based on the GitHub repositories, the process starts to read them in `gh-repos.ts`.  
The next step is to enrich the data from GitHub with NPM data.
From the returned data, the unique types and tags are selected, as well as the individual versions.  
The package data and types/tags are written to `data.json` and the versions to `versions.json`.

## gh-repos.ts

The GitHub process starts with the `get` method.
Before the data is retrieved, a distinction must be made whether the repo is a mono or single repo.
For example, the repo [ui5-ecosystem-showcase](https://github.com/ui5-community/ui5-ecosystem-showcase) is a monorepo with many middleware and tasks.
With `getRepoInfo` the metadata is retrieved from the GitHub repo.
This is done using this [GitHub Repositories API](https://docs.github.com/en/rest/repos/repos).
Additionally, `updatedAt` is determined by when the last commit was on the default branch (currently only by `generators`).
With `fetchRepo` data is retrieved directly from the repository.
Here the `package.json` and the `README.md` for the later representation on the web page.

The JSDoc are also retrieved with `getJsdoc` if it exists. Currently this is done for the types "task" and "middleware".
For correct processing the `ui5.yaml` is also parsed here.

Because the types `generator` are not on NPM, an attempt is made to generate a key figure with the cloning statistics.  
This happens with the method `updateCloningStats`. For this API special permissions are needed and therefore a special GitHub token must be used (`WORKFLOW_CRAWL_GITHUB_TOKEN`) which has more permissions than the default token.

## npm.ts

The class `NpmProvider` is there to enrich the GitHub data.
Therefore the packages array is passed here.
It retrieves the metadata from NPM, as well as the historical download counts.
To optimize the downloads they are combined for bulk retrieval and retrieved with `getDownloadsBulk`.
The following download numbers are currently retrieved:

- current fortnight
- last fortnight
- last 30 days
- last year
- last year per month

Metadata is also retrieved. Currently the following data is used by NPM:

- created At
- updated At
- all versions

## Workflow

To retrieve the clones statistics from Github, a special GitHub token is used in the workflow (`WORKFLOW_CRAWL_GITHUB_TOKEN`).  
This token has more permissions than the default token.  

The workflow uses `ubuntu-latest` with node 16.  

Basically, the latest data is always published on the 'live-data' branch. These data are partly rebuilt from scratch(`data.json`, `versions.json`) and partly enriched (`clones.json`).  
First the main branch and then the branch `live-data` is cloned to perform a rebase in the `main` branch.  
This ensures that the data is reused.  

After that the module is installed and with `npm run build` the typescript script is executed.
Thereby the data files are updated.
After that the committed update is pushed to the `live-data` branch.

## Files

### sources.json

For this file there is a [type definition](https://github.com/ui5-community/bestofui5-data/blob/5860fd33a980bcdc8c23fb3b7bf25d7c36607ebe/src/types.d.ts#L64-L73) how the content should look like.  

For this file there is a type definition how the content should look like.
A singlerepo needs:

- owner --> username or organization name
- repo --> Repository name
- subpath --> for monorepos, path were the subpackages are located
- subpackages --> for monorepos, list of subpackages
- addedToBoUI5 --> timestamp when this package was added to BestofUI5
- type --> type of the package, see enum [`BoUI5Types`](https://github.com/ui5-community/bestofui5-data/blob/5860fd33a980bcdc8c23fb3b7bf25d7c36607ebe/src/types.d.ts#L1-L8) for this
- tags --> list of tags

### data.json

There are two arrays in this file.  
In the array Packages are all packages with the information.  
In the second array all types/tags are present. This is used in the [Tags View](https://bestofui5.org/#/tags).

### versions.json

This file is generated from all NPM packages and their versions.  
This file is used in the [Timeline View](https://bestofui5.org/#/timeline).

### clones.json

This file is used only for the generators. Since these do not have an NPM package, an attempt is made to collect a measure via the number of clones of the repository.  
Since the API only displays the last 15 days, this file will store historical data.

## run locally

git clone:  
`git clone https://github.com/ui5-community/bestofui5-data`

install:  
`npm install`

set github token (check which one is four your OS):  
`export GITHUB_TOKEN=<your token>`  
`set GITHUB_TOKEN=<your token>`  
`$env:GITHUB_TOKEN="<your token>"`  

run crawl:  
`npm run build`

When you run the build command without a github token, the workflow will probably run soon into a rate limit.  

The crawl will probably also fail when retrieving the clone statistics.
However, this section is in a try/catch and will only show the error.
The rest should go through normally.

## License

This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
