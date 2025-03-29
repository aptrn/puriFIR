# Example Max Project with TypeScript and npm Dependencies

This project demonstrates how to use TypeScript in Max with npm dependencies.

## Table of Contents

- [Why TypeScript](#why-typescript)
- [Dependencies](#dependencies)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Installing Dependencies Available to Max](#installing-dependencies-available-to-max)

## Why TypeScript

Max uses the [js object](https://docs.cycling74.com/max8/refpages/js) to run JavaScript code. The js object runtime in Max is [ECMAScript 2009, also known as ES5](https://www.w3schools.com/js/js_es5.asp), which is outdated and supports a limited set of features. However, you can use TypeScript to write **modern JavaScript (with types!)** and transpile it to ES5 to run in Max.

This repository is set up to use [this tool](https://github.com/aptrn/maxmsp-ts) to transpile your TypeScript code to ES5 for use in Max. A key feature of this setup is that it allows you to use npm libraries in your Max+TypeScript project.

## Dependencies

[npm](https://npmjs.com) is the Node.js package manager and a public registry full of open-source JavaScript code for use in your projects. However, not all code on npm is compatible with ES5 and therefore not always usable in Max. You need to check Max compatibility yourself or, if you're writing your own library, you can use [this template](https://github.com/aptrn/maxmsp-ts-library-template) to get started.

If you're sure a library is compatible with Max, you can [add it to the config file](#installing-dependencies-available-to-max), and it will be included in the compiled output.

## Prerequisites

- [git](https://git-scm.com/downloads)
- [Max](https://cycling74.com/downloads)
- [Node.js](https://nodejs.org/en/download/)
  - You can use [nvm for Windows](https://github.com/coreybutler/nvm-windows) or [nvm for Linux or Mac](https://github.com/nvm-sh/nvm)
- [pnpm](https://pnpm.io/installation) (optional)
  - Run `npm install -g pnpm`

## Getting Started

1. Click the `Use this template` button on the top right of this page
2. Clone your new repository:
   ```
   git clone https://github.com/your-username/your-repo.git
   ```
3. Install dependencies:
   ```
   pnpm install
   ```
4. Compile the code:
   - Run `pnpm build` for a one-time build
   - Or `pnpm dev` to build with live reloading
5. Open the Max project file: `maxmsp-ts-example.maxproj`

## Bundle dependencies for Max

You can install dependencies using `pnpm i -D <package-name>`. If you're sure the dependency is [**compatible with Max**](#dependencies), you can add it to the config file.

The configuration file `maxmsp.config.json` determines which dependencies are included in the compiled output. The default `output_path` is `lib`, placed as a subdirectory of the `outDir` found in the `tsconfig.json` file.

You can manually edit the `maxmsp.config.json` file or use command-line scripts:

```
pnpm maxmsp add <package-name> [--alias] [--path] [--files]
```

- `--alias`: Optional. Sets the prefix for the copied files. Default is the package name.
- `--path`: Optional. Sets the path to the package. Default is the package name.
- `--files`: Optional. Sets the files to copy. Default is `index.js`.

Example:

```
pnpm maxmsp add @not251/not251 --alias not251 --files "index.js, index.map.js"
```

This will copy files:

- `node_modules/@not251/not251/dist/index.js`
- `node_modules/@not251/not251/dist/index.map.js`

To:

- `lib/not251/not251_index.js`
- `lib/not251/not251_index.map.js`

---

This project is heavily inspired by [TypeScript-for-Max](https://github.com/ErnstHot/TypeScript-for-Max) and uses [Max/Msp types at DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/maxmsp)
