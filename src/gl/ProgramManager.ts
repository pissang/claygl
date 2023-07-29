import { keys } from '../core/util';
import { ShaderDefineValue, ShaderPrecision } from '../Shader';
import GLProgram from './GLProgram';
import GLPipeline, { GLMaterialObject, GLRenderableObject } from './GLPipeline';

const loopRegex =
  /for\s*?\(int\s*?_idx_\s*=\s*([\w-]+);\s*_idx_\s*<\s*([\w-]+);\s*_idx_\s*\+\+\s*\)\s*\{\{([\s\S]+?)(?=\}\})\}\}/g;

function unrollLoop(
  shaderStr: string,
  defines: Record<string, ShaderDefineValue>,
  extraDefines?: Record<string, ShaderDefineValue>
) {
  // In some case like shadowMap in loop use 'i' to index value much slower.

  // Loop use _idx_ and increased with _idx_++ will be unrolled
  // Use {{ }} to match the pair so the if statement will not be affected
  // Write like following
  // for (int _idx_ = 0; _idx_ < 4; _idx_++) {{
  //     vec3 color = texture2D(textures[_idx_], uv).rgb;
  // }}
  function replace(match: string, start: string, end: string, snippet: string) {
    let unroll = '';
    // Try to treat as define
    if (isNaN(start as any as number)) {
      if (start in defines) {
        start = defines[start] as string;
      } else if (extraDefines) {
        start = extraDefines[start] as any as string;
      }
    }
    if (isNaN(end as any as number)) {
      if (end in defines) {
        end = defines[end] as string;
      } else if (extraDefines) {
        end = extraDefines[end] as any as string;
      }
    }
    // TODO Error checking
    for (let idx = parseInt(start); idx < parseInt(end); idx++) {
      // PENDING Add scope?
      unroll +=
        '{' +
        snippet
          .replace(/float\s*\(\s*_idx_\s*\)/g, idx.toFixed(1))
          .replace(/_idx_/g, idx as any as string) +
        '}';
    }

    return unroll;
  }

  return shaderStr.replace(loopRegex, replace);
}

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

// function getExtensionCode(exts: string[][]) {
//   // Extension declaration must before all non-preprocessor codes
//   // TODO vertex ? extension enum ?
//   const extensionStr = [];
//   for (let i = 0; i < exts.length; i++) {
//     extensionStr.push('#extension GL_' + exts[i][0] + ' : enable');
//   }
//   return extensionStr.join('\n');
// }

function getPrecisionCode(precision: ShaderPrecision) {
  return ['float', 'int', 'sampler2D', 'sampler2DArray']
    .map((type) => `precision ${precision} ${type};`)
    .join('\n');
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
  private _pipeline: GLPipeline;
  private _cache: Record<string, GLProgram> = {};
  private _parallelExt: any;
  constructor(renderer: GLPipeline, parallelExt: any) {
    this._pipeline = renderer;
    this._parallelExt = parallelExt;
  }

  getProgram(
    renderable: GLRenderableObject,
    material: GLMaterialObject,
    extraKey: string,
    extraDefines?: Record<string, ShaderDefineValue>
  ) {
    const cache = this._cache;
    const renderer = this._pipeline;
    const parallelExt = this._parallelExt;
    const _gl = renderer.gl;

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
      if (program.__compiling) {
        // Check compiling status
        if (program.checkParallelCompiled(_gl, parallelExt)) {
          program.updateLinkStatus(_gl);
        }
      }
      return program;
    }

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
    if (extraDefines) {
      commonDefineCode += getDefineCode(extraDefines) + '\n';
    }
    // TODO Optimize key generation
    // VERTEX
    let vertexDefineStr = commonDefineCode + getDefineCode(vertexDefines, enabledTextures);
    // FRAGMENT
    let fragmentDefineStr = commonDefineCode + getDefineCode(fragmentDefines, enabledTextures);
    const versionStr = shader.version === 3 ? `#version 300 es\n` : '';

    const vertexCode = versionStr + vertexDefineStr + '\n' + shader.vertex;

    const fragmentCode =
      versionStr +
      [
        // getExtensionCode(extensions),
        getPrecisionCode(material.precision || 'highp'),
        fragmentDefineStr,
        shader.fragment
      ].join('\n');

    const finalVertexCode = unrollLoop(vertexCode, vertexDefines, extraDefines);
    const finalFragmentCode = unrollLoop(fragmentCode, fragmentDefines, extraDefines);

    program = new GLProgram();
    program.attributes = shader.attributes;
    program.buildProgram(_gl, shader, finalVertexCode, finalFragmentCode);

    if (parallelExt) {
      program.__compiling = true;
    } else {
      program.updateLinkStatus(_gl);
    }

    cache[key] = program;

    return program;
  }

  isAllProgramCompiled() {
    if (!this._parallelExt) {
      return true;
    }
    const cache = this._cache;
    const gl = this._pipeline.gl;
    for (const key in cache) {
      const program = cache[key];
      if (program.__compiling) {
        if (program.checkParallelCompiled(gl, this._parallelExt)) {
          program.updateLinkStatus(gl);
        } else {
          return false;
        }
      }
    }
    return true;
  }
}

export default ProgramManager;
