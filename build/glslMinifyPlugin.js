import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
function minify(code) {
  return (
    code
      .replace(/\r/g, '') // remove \r
      // Not replace ///
      // .replace(/\/\/\//g, temporalPlaceHolder)
      .replace(/[ \t]*\/\/.*\n/g, '') // remove //
      .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
      .replace(/\n{2,}/g, '\n') // # \n+ to \n
      .replace(/ +/g, ' ') // Remove spaces.
  );
}
/**
 * Note: the typescript target must be set to ES6+
 * so the tagged template expression won't be transpiled to function call.
 */
export default function glslMinifyPlugin() {
  return {
    name: 'glsl-minify',
    transform(code) {
      if (!code.match(`glsl`)) return;
      try {
        const ast = parse(code, {
          sourceType: 'module'
        });
        traverse(ast, {
          // Tagged template expression
          TaggedTemplateExpression(path) {
            if (path.node.tag.name !== 'glsl') return;
            for (const quasi of path.node.quasi.quasis) {
              const transformedData = minify(quasi.value.raw);
              quasi.value.raw = transformedData;
              quasi.value.cooked = transformedData;
            }
          }
        });
        return generate(ast, {
          sourceMaps: true
        });
      } catch (e) {
        console.error(e);
        return;
      }
    }
  };
}
