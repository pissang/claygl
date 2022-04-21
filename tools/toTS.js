const fs = require('fs');
const { glob } = require('glob');
const path = require('path');

glob(path.join(__dirname, '../src/**/*.js'), (err, files) => {
    for (let file of files) {
        console.log(file)
        const content = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(file.replace('.js', '.ts'), '// @ts-nocheck\n' + content, 'utf8');
        fs.rmSync(file);
    }
})