const istanbulAPI = require('istanbul-api');
const libCoverage = require('istanbul-lib-coverage');
const Spec = require('mocha/lib/reporters/Base');

class Istanbul extends Spec {
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