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

Installation of electron in China may fail as its host is blocked for well known reason.

Yon can export an evironment variable to change electron's mirror to taobao.
```
export ELECTRON_MIRROR=http://npm.taobao.org/mirrors/electron/
```

## Integration Tests

Compare spec's paiting result with pre-generated fixtures.

### Test Flow with Coverage
* build with test/rollup.config.js, generate dist/clay.src.js, with inline sourcemap
* run istanbul instrument, instrument clay.src.js with code coverage wrappers and generate dist/clay.js
* run specs
* generate coverage-final.json and lcov.info with a customized mocha reporter (test/reporter/istanbul-reporter)
* generate html coverage reports with remap-istanbul based on coverage-final.json and sourcemap
* delete dist/clay.src.js

### Generate Fixtures
```shell
npm run gen:fixture
```
Generate fixture for specs matching the pattern:
```shell
npm run gen:texture -- -g "texture anistropic"
```

### Fixture test report
```shell
npm run test:fixture
```
A html report named `fixture-report.html` will be generated in `coverage` folder.

The report template is `test/reporter/fixture-tmpl.html`.

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
npm test -- -- -g "texture anistropic"
```
```shell
npm run tdd -- -g "texture anistropic"
```
* run fixture tests (compare failed integration tests)
```shell
npm run test:fixture
```
* run test with coverage
```shell
npm test:cov
```
* debug
```shell
npm run debug
```