const istanbulAPI = require('istanbul-api');
const libCoverage = require('istanbul-lib-coverage');
const BaseReporter = require('mocha/lib/reporters/base');

class Istanbul extends BaseReporter {
  constructor(runner) {
    super(runner);
    runner.on('fail', (test, err) => {
      const title = test.fullTitle();
      console.log('[X] %s', title);
  });
    runner.on('end', () => {
      const mainReporter = istanbulAPI.createReporter();
      const coverageMap = libCoverage.createCoverageMap();

      coverageMap.merge(global.__coverage__ || {});

      mainReporter.addAll(['lcovonly', 'json']);
      mainReporter.write(coverageMap, {});
      console.log('Tests ended.');
      console.log('Coverage reports generated');
    });
  }
}


module.exports = Istanbul;