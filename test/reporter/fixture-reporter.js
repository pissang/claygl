const { getTestErrors } = require('../common/util');
const Spec = require('mocha/lib/reporters/Base');
const fs = require('fs');
const path = require('path');

class Istanbul extends Spec {
  constructor(runner) {
    super(runner);    
    const failedTitles = [];
    runner.on('fail', (test, err) => {
        const title = test.fullTitle();
        //record failed integration tests
        failedTitles.push(title);    
        console.log('[X] %s', title);
    });
    runner.on('end', () => {
        const errors = getTestErrors();
        const path = generateReport(failedTitles, errors);
        if (errors.length > 0) {
            console.log(errors.length + ' tests failed.');
            console.log('Fixture report generated in : ', path);    
        }
    });
  }
}

function generateReport(failedTitles, errors) {
    const content = failedTitles.map((t, idx) => {
        return `<tr>
          <td>${t}</td>
          <td><img src=${errors[idx].fixture.src} /></td>
          <td><img src=${errors[idx].actual.src} /></td>
        </tr>`
    });
    let tmpl = fs.readFileSync(path.join(__dirname, 'fixture-tmpl.html')).toString();
    tmpl = tmpl.replace('{{content}}', content);
    try {
        fs.mkdirSync(path.join(process.cwd(), 'coverage'));
    } catch (err) {}
    const reportPath = path.join(process.cwd(), 'coverage', 'fixture-report.html');
    fs.writeFileSync(reportPath, tmpl);
    return reportPath;
}

module.exports = Istanbul;
