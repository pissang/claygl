import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
// import { minify } from 'shader-minifier';

// const pragmaPlaceholder = '#pragma __placeholder__';
// const placeholder = `\n${pragmaPlaceholder}\n`;
const placeholderInline = '__inline_placeholder__';
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
        // ????
        (traverse.default ?? traverse)(ast, {
          // Tagged template expression
          TaggedTemplateExpression(path) {
            // if (path.node.tag.name !== 'glsl') return;
            // let fullCode = '';
            // for (let i = 0; i < path.node.quasi.quasis.length; i++) {
            //   // console.log(path.node.quasi.quasis[i].value.raw);
            //   fullCode += path.node.quasi.quasis[i].value.raw;

            //   const nextQuasi = path.node.quasi.quasis[i + 1];
            //   if (nextQuasi) {
            //     if (nextQuasi.value.raw.match(/^\s*\n/)) {
            //       fullCode += placeholder;
            //     } else {
            //       // Inline placeholder if for replacing the variable name.
            //       fullCode += placeholderInline;
            //     }
            //   }
            // }

            const fullCode = path.node.quasi.quasis
              .map((quasi) => quasi.value.raw)
              .join(placeholderInline);
            let transformedCode = minify(fullCode);
            // if (transformedCode.startsWith(pragmaPlaceholder)) {
            //   // Add '\n' prefix
            //   transformedCode = '\n' + transformedCode;
            // }
            // if (transformedCode.endsWith(pragmaPlaceholder)) {
            //   // Add '\n' suffix
            //   transformedCode += '\n';
            // }

            const transformedData = transformedCode.split(
              // new RegExp([placeholder, placeholderInline].join('|'), 'g')
              new RegExp(placeholderInline, 'g')
            );
            if (!transformedData || transformedData.length !== path.node.quasi.quasis.length) {
              return;
            }
            for (let i = 0; i < path.node.quasi.quasis.length; i++) {
              const quasi = path.node.quasi.quasis[i];
              quasi.value.raw = transformedData[i];
              quasi.value.cooked = transformedData[i];
            }
          }
        });
        return (generate.default ?? generate)(ast, {
          sourceMaps: true
        });
      } catch (e) {
        console.error(e);
        return;
      }
    }
  };
}
