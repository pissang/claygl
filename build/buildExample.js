const esbuild = require('esbuild');
const glob = require('glob');
const path = require('path');

glob(path.resolve(__dirname, '../example/triangle_customshader.ts'), async (err, files) => {
  for (let file of files) {
    const basename = path.basename(file);
    esbuild.build({
      entryPoints: [file],
      bundle: true,
      minify: true,
      target: 'es2020',
      outfile: path.resolve(__dirname, '../example/bundle/' + basename)
    });
  }
});
