// @ts-nocheck
import GLProgram from './GLProgram';

var loopRegex =
  /for\s*?\(int\s*?_idx_\s*\=\s*([\w-]+)\;\s*_idx_\s*<\s*([\w-]+);\s*_idx_\s*\+\+\s*\)\s*\{\{([\s\S]+?)(?=\}\})\}\}/g;

function unrollLoop(shaderStr, defines, lightsNumbers) {
  // Loop unroll from three.js, https://github.com/mrdoob/three.js/blob/master/src/renderers/webgl/WebGLProgram.js#L175
  // In some case like shadowMap in loop use 'i' to index value much slower.

  // Loop use _idx_ and increased with _idx_++ will be unrolled
  // Use {{ }} to match the pair so the if statement will not be affected
  // Write like following
  // for (int _idx_ = 0; _idx_ < 4; _idx_++) {{
  //     vec3 color = texture2D(textures[_idx_], uv).rgb;
  // }}
  function replace(match, start, end, snippet) {
    var unroll = '';
    // Try to treat as define
    if (isNaN(start)) {
      if (start in defines) {
        start = defines[start];
      } else {
        start = lightNumberDefines[start];
      }
    }
    if (isNaN(end)) {
      if (end in defines) {
        end = defines[end];
      } else {
        end = lightNumberDefines[end];
      }
    }
    // TODO Error checking

    for (var idx = parseInt(start); idx < parseInt(end); idx++) {
      // PENDING Add scope?
      unroll +=
        '{' +
        snippet.replace(/float\s*\(\s*_idx_\s*\)/g, idx.toFixed(1)).replace(/_idx_/g, idx) +
        '}';
    }

    return unroll;
  }

  var lightNumberDefines = {};
  for (var lightType in lightsNumbers) {
    lightNumberDefines[lightType + '_COUNT'] = lightsNumbers[lightType];
  }
  return shaderStr.replace(loopRegex, replace);
}

function getDefineCode(defines, lightsNumbers, enabledTextures) {
  var defineStr = [];
  if (lightsNumbers) {
    for (var lightType in lightsNumbers) {
      var count = lightsNumbers[lightType];
      if (count > 0) {
        defineStr.push('#define ' + lightType.toUpperCase() + '_COUNT ' + count);
      }
    }
  }
  if (enabledTextures) {
    for (var i = 0; i < enabledTextures.length; i++) {
      var symbol = enabledTextures[i];
      defineStr.push('#define ' + symbol.toUpperCase() + '_ENABLED');
    }
  }
  // Custom Defines
  for (var symbol in defines) {
    var value = defines[symbol];
    if (value === null) {
      defineStr.push('#define ' + symbol);
    } else {
      defineStr.push('#define ' + symbol + ' ' + value.toString());
    }
  }
  return defineStr.join('\n');
}

function getExtensionCode(exts) {
  // Extension declaration must before all non-preprocessor codes
  // TODO vertex ? extension enum ?
  var extensionStr = [];
  for (var i = 0; i < exts.length; i++) {
    extensionStr.push('#extension GL_' + exts[i][0] + ' : enable');
  }
  return extensionStr.join('\n');
}

function getPrecisionCode(precision) {
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

function ProgramManager(renderer) {
  this._renderer = renderer;
  this._cache = {};
}

ProgramManager.prototype.getProgram = function (renderable, material, scene, renderer) {
  var cache = this._cache;

  var isSkinnedMesh = renderable.isSkinnedMesh && renderable.isSkinnedMesh();
  var isInstancedMesh = renderable.isInstancedMesh && renderable.isInstancedMesh();
  var key = 's' + material.shader.shaderID + 'm' + material.getProgramKey();
  if (scene) {
    key += 'se' + scene.getProgramKey(renderable.lightGroup);
  }
  if (isSkinnedMesh) {
    key += ',sk' + renderable.joints.length;
  }
  if (isInstancedMesh) {
    key += ',is';
  }
  if (renderer.logDepthBuffer) {
    key += ',ld';
  }
  var program = cache[key];

  if (program) {
    return program;
  }

  var lightsNumbers = scene ? scene.getLightsNumbers(renderable.lightGroup) : {};
  var renderer = this._renderer;
  var _gl = renderer.gl;
  var enabledTextures = material.getEnabledTextures();
  var extraDefineCode = '';
  if (isSkinnedMesh) {
    var skinDefines = {
      SKINNING: null,
      JOINT_COUNT: renderable.joints.length
    };
    if (renderable.joints.length > renderer.getMaxJointNumber()) {
      skinDefines.USE_SKIN_MATRICES_TEXTURE = null;
    }
    // TODO Add skinning code?
    extraDefineCode += '\n' + getDefineCode(skinDefines) + '\n';
  }
  if (isInstancedMesh) {
    extraDefineCode += '\n#define INSTANCING\n';
  }
  if (renderer.logDepthBuffer) {
    extraDefineCode += '\n#define LOG_DEPTH\n';
  }
  // TODO Optimize key generation
  // VERTEX
  var vertexDefineStr =
    extraDefineCode + getDefineCode(material.vertexDefines, lightsNumbers, enabledTextures);
  // FRAGMENT
  var fragmentDefineStr =
    extraDefineCode + getDefineCode(material.fragmentDefines, lightsNumbers, enabledTextures);

  var extensions = [
    ['OES_standard_derivatives', 'STANDARD_DERIVATIVES'],
    ['EXT_shader_texture_lod', 'TEXTURE_LOD'],
    ['EXT_frag_depth', 'FRAG_DEPTH']
  ].filter(function (ext) {
    return renderer.getGLExtension(ext[0]) != null;
  });

  for (var i = 0; i < extensions.length; i++) {
    var extDefineCode = '\n#define SUPPORT_' + extensions[i][1];
    fragmentDefineStr += extDefineCode;
    vertexDefineStr += extDefineCode;
  }

  var vertexCode = vertexDefineStr + '\n' + material.shader.vertex;

  var fragmentCode =
    getExtensionCode(extensions) +
    '\n' +
    getPrecisionCode(material.precision) +
    '\n' +
    fragmentDefineStr +
    '\n' +
    material.shader.fragment;

  var finalVertexCode = unrollLoop(vertexCode, material.vertexDefines, lightsNumbers);
  var finalFragmentCode = unrollLoop(fragmentCode, material.fragmentDefines, lightsNumbers);

  var program = new GLProgram();
  program.uniformSemantics = material.shader.uniformSemantics;
  program.attributes = material.shader.attributes;
  var errorMsg = program.buildProgram(_gl, material.shader, finalVertexCode, finalFragmentCode);
  program.__error = errorMsg;

  cache[key] = program;

  return program;
};

export default ProgramManager;
