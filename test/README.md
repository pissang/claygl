# Unit Tests

* [Install](#Install)
* [Run tests](#run-tests)
* [Debug in VS Code](#debug-in-vs-code)

## Install

### Pre-requisite

The unit tests are built on mocha, [node-canvas](https://github.com/Automattic/node-canvas) and [headless-gl](https://github.com/stackgl/headless-gl).

#### node version

`>= 6.x` as the tests is written in ES2015.

#### windows

To build `canvas` and `headless-gl`, you need the following:

* windows-build-tools

```shell
npm install --global --production windows-build-tools
```

* Python 2 and add `path-to-python` to system enviroment path.

* GTK 2

You will need the [cairo](http://cairographics.org) library which is bundled in GTK. Download the GTK 2 bundle for [Win32](http://ftp.gnome.org/pub/GNOME/binaries/win32/gtk+/2.24/gtk+-bundle_2.24.10-20120208_win32.zip) or [Win64](http://ftp.gnome.org/pub/GNOME/binaries/win64/gtk+/2.22/gtk+-bundle_2.22.1-20101229_win64.zip). Unzip the contents in `C:\GTK`.

*Notes:*

    * Both GTK and Node.js need either be 64bit or 32bit to compile successfully.
    * Download GTK 2, _**not GTK 3**_, which is missing the required libpng. If you get inker errors you've most likely picked the wrong bundle.
    * If you use a different location than `C:\GTK`, add a `GTK_Root` argument to `npm install` or `node-gyp rebuild`. For example: `node-gyp rebuild --GTK_Root=C:\somewhere\GTK`.

#### Linux and Mac

Please refer to [node-canvas](https://github.com/Automattic/node-canvas) and [headless-gl](https://github.com/stackgl/headless-gl)'s docs.

### Install dependencies

```shell
npm install
```


## Run tests
* run and watch
```shell
npm run tdd
```
* run
```shell
npm test
```

## Debug in VS Code

You can debug tests with VS Code, just google "mocha vscode debug" for details.
