import { keys } from '../core/util';
import Material from '../Material';
import { ShaderDefineValue, ShaderPrecision } from '../Shader';
import GLProgram from './GLProgram';
import GLRenderer, { GLMaterialObject, GLRenderableObject } from './GLRenderer';

// const loopRegex =
//   /for\s*?\(int\s*?_idx_\s*=\s*([\w-]+);\s*_idx_\s*<\s*([\w-]+);\s*_idx_\s*\+\+\s*\)\s*\{\{([\s\S]+?)(?=\}\})\}\}/g;

// function unrollLoop(
//   shaderStr: string,
//   defines: Record<string, ShaderDefineValue>,
//   lightsNumbers: Record<string, number>
// ) {
//   // Loop unroll from three.js, https://github.com/mrdoob/three.js/blob/master/src/renderers/webgl/WebGLProgram.js#L175
//   // In some case like shadowMap in loop use 'i' to index value much slower.

//   // Loop use _idx_ and increased with _idx_++ will be unrolled
//   // Use {{ }} to match the pair so the if statement will not be affected
//   // Write like following
//   // for (int _idx_ = 0; _idx_ < 4; _idx_++) {{
//   //     vec3 color = texture2D(textures[_idx_], uv).rgb;
//   // }}
//   function replace(match: string, start: string, end: string, snippet: string) {
//     let unroll = '';
//     // Try to treat as define
//     if (isNaN(start as any as number)) {
//       if (start in defines) {
//         start = defines[start] as string;
//       } else {
//         start = lightNumberDefines[start] as any as string;
//       }
//     }
//     if (isNaN(end as any as number)) {
//       if (end in defines) {
//         end = defines[end] as string;
//       } else {
//         end = lightNumberDefines[end] as any as string;
//       }
//     }
//     // TODO Error checking
//     for (let idx = parseInt(start); idx < parseInt(end); idx++) {
//       // PENDING Add scope?
//       unroll +=
//         '{' +
//         snippet
//           .replace(/float\s*\(\s*_idx_\s*\)/g, idx.toFixed(1))
//           .replace(/_idx_/g, idx as any as string) +
//         '}';
//     }

//     return unroll;
//   }

//   const lightNumberDefines: Record<string, number> = {};
//   for (const lightType in lightsNumbers) {
//     lightNumberDefines[lightType + '_COUNT'] = lightsNumbers[lightType];
//   }
//   return shaderStr.replace(loopRegex, replace);
// }

function getDefineCode(defines: Record<string, ShaderDefineValue>, enabledTextures?: string[]) {
  const defineStr = [];
  if (enabledTextures) {
    for (let i = 0; i < enabledTextures.length; i++) {
      const symbol = enabledTextures[i];
      defineStr.push('#define ' + symbol.toUpperCase() + '_ENABLED');
    }
  }
  // Custom Defines
  for (const symbol in defines) {
    const value = defines[symbol];
    if (value == null) {
      defineStr.push('#define ' + symbol);
    } else {
      defineStr.push('#define ' + symbol + ' ' + value.toString());
    }
  }
  return defineStr.join('\n');
}

function getExtensionCode(exts: string[][]) {
  // Extension declaration must before all non-preprocessor codes
  // TODO vertex ? extension enum ?
  const extensionStr = [];
  for (let i = 0; i < exts.length; i++) {
    extensionStr.push('#extension GL_' + exts[i][0] + ' : enable');
  }
  return extensionStr.join('\n');
}

function getPrecisionCode(precision: ShaderPrecision) {
  return (
    ['precision', precision, 'float'].join(' ') +
    ';\n' +
    ['precision', precision, 'int'].join(' ') +
    ';\n' +
    // depth texture may have precision problem on iOS device.
    ['precision', precision, 'sampler2D'].join(' ') +
    ';\n'
  );
}

function defaultGetEnabledTextures(material: Material) {
  const uniforms = material.uniforms;
  return keys(uniforms).filter(
    (uniformName) => uniforms[uniformName].type === 't' || uniforms[uniformName].type === 'tv'
  );
}

function getDefineKey(defines: Record<string, ShaderDefineValue>) {
  const defineKeys = keys(defines);
  const defineStr = [];
  defineKeys.sort();
  // Custom Defines
  for (let i = 0; i < defineKeys.length; i++) {
    const key = defineKeys[i];
    const value = defines[key];
    defineStr.push(value == null ? key : key + ' ' + value.toString());
  }
  return defineStr.join('\n');
}

export function defaultGetMaterialProgramKey(
  vertexDefines: Record<string, ShaderDefineValue>,
  fragmentDefines: Record<string, ShaderDefineValue>,
  enabledTextures: string[]
) {
  enabledTextures.sort();
  const defineStr = [];
  for (let i = 0; i < enabledTextures.length; i++) {
    const symbol = enabledTextures[i];
    defineStr.push(symbol);
  }
  return (
    getDefineKey(vertexDefines) + '\n' + getDefineKey(fragmentDefines) + '\n' + defineStr.join('\n')
  );
}

class ProgramManager {
  private _renderer: GLRenderer;
  private _cache: Record<string, GLProgram> = {};
  constructor(renderer: GLRenderer) {
    this._renderer = renderer;
  }

  getProgram(
    renderable: GLRenderableObject,
    material: GLMaterialObject,
    extraKey: string,
    extraDefineCode: string
  ) {
    const cache = this._cache;
    const renderer = this._renderer;

    const isSkinnedMesh = renderable.isSkinnedMesh && renderable.isSkinnedMesh();
    const isInstancedMesh = renderable.isInstancedMesh && renderable.isInstancedMesh();
    const enabledTextures = material.getEnabledTextures ? material.getEnabledTextures() : [];
    const shader = material.shader!;
    const vertexDefines = material.vertexDefines || {};
    const fragmentDefines = material.fragmentDefines || {};
    let key =
      's' +
      material.shader!.shaderID +
      'm' +
      (material.getProgramKey
        ? material.getProgramKey()
        : defaultGetMaterialProgramKey(vertexDefines, fragmentDefines, enabledTextures));
    if (isSkinnedMesh) {
      key += ',sk' + renderable.joints.length;
    }
    if (isInstancedMesh) {
      key += ',is';
    }
    if (extraKey) {
      key += ',ex' + extraKey;
    }
    let program = cache[key];

    if (program) {
      return program;
    }

    const _gl = renderer.gl;
    let commonDefineCode = '';
    if (isSkinnedMesh) {
      const skinDefines: Record<string, ShaderDefineValue> = {
        SKINNING: null,
        JOINT_COUNT: renderable.joints.length
      };
      if (renderable.joints.length > renderer.maxJointNumber) {
        skinDefines.USE_SKIN_MATRICES_TEXTURE = null;
      }
      // TODO Add skinning code?
      commonDefineCode += '\n' + getDefineCode(skinDefines) + '\n';
    }
    if (isInstancedMesh) {
      commonDefineCode += '\n#define INSTANCING\n';
    }
    if (extraDefineCode) {
      commonDefineCode += extraDefineCode + '\n';
    }
    // TODO Optimize key generation
    // VERTEX
    let vertexDefineStr = commonDefineCode + getDefineCode(vertexDefines, enabledTextures);
    // FRAGMENT
    let fragmentDefineStr = commonDefineCode + getDefineCode(fragmentDefines, enabledTextures);

    const extensions = [
      ['OES_standard_derivatives', 'STANDARD_DERIVATIVES'],
      ['EXT_shader_texture_lod', 'TEXTURE_LOD'],
      ['EXT_frag_depth', 'FRAG_DEPTH']
    ].filter(function (ext) {
      return renderer.getWebGLExtension(ext[0]) != null;
    });

    for (let i = 0; i < extensions.length; i++) {
      const extDefineCode = '\n#define SUPPORT_' + extensions[i][1];
      fragmentDefineStr += extDefineCode;
      vertexDefineStr += extDefineCode;
    }

    const vertexCode = vertexDefineStr + '\n' + shader.vertex;

    const fragmentCode =
      getExtensionCode(extensions) +
      '\n' +
      getPrecisionCode(material.precision || 'highp') +
      '\n' +
      fragmentDefineStr +
      '\n' +
      shader.fragment;

    // const finalVertexCode = unrollLoop(vertexCode, material.vertexDefines, lightsNumbers);
    // const finalFragmentCode = unrollLoop(fragmentCode, material.fragmentDefines, lightsNumbers);

    program = new GLProgram();
    program.attributes = shader.attributes;
    const errorMsg = program.buildProgram(_gl, shader, vertexCode, fragmentCode);
    program.__error = errorMsg;

    cache[key] = program;

    return program;
  }
}

export default ProgramManager;
