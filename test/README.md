# Unit Tests

* [Install](#Install)
* [Integration Tests](#integration-tests)
* [Commands](#commands)

## Install

### Pre-requisite

The unit tests are built on [electron-mocha](https://github.com/jprichardson/electron-mocha).

#### node version

`>= 6.x` as the tests is written in ES2015.

### Install dependencies

```shell
npm install
```

#### Electron

Installation of electron in China may fail as its host is blocked for well know reason.

Yon can export an evironment param to change electron's mirror to taobao.
```
export ELECTRON_MIRROR=http://npm.taobao.org/mirrors/electron/
```

## Integration Tests

Compare spec's paiting result with pre-generated fixtures.

### Test Flow with Coverage
* 用test/rollup.config.js编译, 生成dist/qtek.src.js, 写入sourcemap
* 运行istanbul instrument, 为qtek.src.js手动装载覆盖率逻辑, 生成dist/qtek.js
* 运行specs
* 用自定义mocha reporter (test/istanbul-reporter) 生成coverage-final.json和lcov.info
* 用remap-istanbul基于coverage-final.json和sourcemap生成每个文件的html格式覆盖率报告
* 删除dist/qtek.src.js

### Generate Fixtures
```shell
npm run gen:fixture
```
Generate fixture for specs matching the pattern:
```shell
npm run gen:texture -- -g "texture anistropic"
```

## Commands
* run, watch and debug in electron
```shell
npm run tdd
```
* run test
```shell
npm test
```
* run tests matching patterns
```shell
npm test -- -g "texture anistropic"
```
```shell
npm run tdd -- -g "texture anistropic"
```
* run test with coverage
```shell
npm test:cov
```
* debug
```shell
npm run debug
```