import glob from 'glob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minifyTransform from './glslMinifyPlugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

glob(path.join(__dirname, '../lib/**/*.glsl.js'), (err, files) => {
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const sizeBefore = code.length;
    console.log(`Minify GLSL ${file}`);
    const minified = minifyTransform().transform(code);
    if (minified) {
      const sizeAfter = minified.code.length;
      fs.writeFileSync(file, minified.code, 'utf8');
      console.log(
        `Minified: ${sizeBefore}B -> ${sizeAfter}B (${(sizeAfter / sizeBefore).toFixed(2)}x)`
      );
    } else {
      console.error(`Ignored ${file}`);
    }
  }
});
