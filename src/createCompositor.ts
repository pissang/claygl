// @ts-nocheck
import * as util from './core/util';
import Compositor from './composite/Compositor';
import CompoSceneNode from './composite/SceneNode';
import CompoTextureNode from './composite/TextureNode';
import CompoFilterNode from './composite/FilterNode';
import Shader from './Shader';
import Texture from './Texture';
import Texture2D from './Texture2D';
import TextureCube from './TextureCube';

import registerBuiltinCompositor from './shader/registerBuiltinCompositor';

registerBuiltinCompositor(Shader);

const shaderSourceReg = /^#source\((.*?)\)/;

/**
 * @name clay.createCompositor
 * @function
 * @param {Object} json
 * @param {Object} [opts]
 * @return {clay.compositor.Compositor}
 */
function createCompositor(json, opts) {
  const compositor = new Compositor();
  opts = opts || {};

  const lib = {
    textures: {},
    parameters: {}
  };
  const afterLoad = function () {
    for (let i = 0; i < json.nodes.length; i++) {
      const nodeInfo = json.nodes[i];
      const node = createNode(nodeInfo, lib, opts);
      if (node) {
        compositor.addNode(node);
      }
    }
  };

  for (const name in json.parameters) {
    const paramInfo = json.parameters[name];
    lib.parameters[name] = convertParameter(paramInfo);
  }
  // TODO load texture asynchronous
  loadTextures(json, lib, opts, function (textureLib) {
    lib.textures = textureLib;
    afterLoad();
  });

  return compositor;
}

function createNode(nodeInfo, lib, opts) {
  const type = nodeInfo.type || 'filter';
  let shaderSource;
  let inputs;
  let outputs;

  if (type === 'filter') {
    const shaderExp = nodeInfo.shader.trim();
    const res = shaderSourceReg.exec(shaderExp);
    if (res) {
      shaderSource = Shader.source(res[1].trim());
    } else if (shaderExp.charAt(0) === '#') {
      shaderSource = lib.shaders[shaderExp.substr(1)];
    }
    if (!shaderSource) {
      shaderSource = shaderExp;
    }
    if (!shaderSource) {
      return;
    }
  }

  if (nodeInfo.inputs) {
    inputs = {};
    for (const name in nodeInfo.inputs) {
      if (typeof nodeInfo.inputs[name] === 'string') {
        inputs[name] = nodeInfo.inputs[name];
      } else {
        inputs[name] = {
          node: nodeInfo.inputs[name].node,
          pin: nodeInfo.inputs[name].pin
        };
      }
    }
  }
  if (nodeInfo.outputs) {
    outputs = {};
    for (const name in nodeInfo.outputs) {
      const outputInfo = nodeInfo.outputs[name];
      outputs[name] = {};
      if (outputInfo.attachment != null) {
        outputs[name].attachment = outputInfo.attachment;
      }
      if (outputInfo.keepLastFrame != null) {
        outputs[name].keepLastFrame = outputInfo.keepLastFrame;
      }
      if (outputInfo.outputLastFrame != null) {
        outputs[name].outputLastFrame = outputInfo.outputLastFrame;
      }
      if (outputInfo.parameters) {
        outputs[name].parameters = convertParameter(outputInfo.parameters);
      }
    }
  }
  let node;
  if (type === 'scene') {
    node = new CompoSceneNode({
      name: nodeInfo.name,
      scene: opts.scene,
      camera: opts.camera,
      outputs: outputs
    });
  } else if (type === 'texture') {
    node = new CompoTextureNode({
      name: nodeInfo.name,
      outputs: outputs
    });
  }
  // Default is filter
  else {
    node = new CompoFilterNode({
      name: nodeInfo.name,
      shader: shaderSource,
      inputs: inputs,
      outputs: outputs
    });
  }
  if (node) {
    if (nodeInfo.parameters) {
      for (const name in nodeInfo.parameters) {
        let val = nodeInfo.parameters[name];
        if (typeof val === 'string') {
          val = val.trim();
          if (val.charAt(0) === '#') {
            val = lib.textures[val.substr(1)];
          } else {
            node.on('beforerender', createSizeSetHandler(name, tryConvertExpr(val)));
          }
        } else if (typeof val === 'function') {
          node.on('beforerender', val);
        }
        node.setParameter(name, val);
      }
    }
    if (nodeInfo.defines && node.pass) {
      for (const name in nodeInfo.defines) {
        const val = nodeInfo.defines[name];
        node.pass.material.define('fragment', name, val);
      }
    }
  }
  return node;
}

function defaultWidthFunc(width) {
  return width;
}
function defaultHeightFunc(width, height) {
  return height;
}

function convertParameter(paramInfo) {
  const param = {};
  if (!paramInfo) {
    return param;
  }
  ['type', 'minFilter', 'magFilter', 'wrapS', 'wrapT', 'flipY', 'useMipmap'].forEach(function (
    name
  ) {
    let val = paramInfo[name];
    if (val != null) {
      // Convert string to enum
      if (typeof val === 'string') {
        val = Texture[val];
      }
      param[name] = val;
    }
  });

  const sizeScale = paramInfo.scale || 1;
  ['width', 'height'].forEach(function (name) {
    if (paramInfo[name] != null) {
      let val = paramInfo[name];
      if (typeof val === 'string') {
        val = val.trim();
        param[name] = createSizeParser(name, tryConvertExpr(val), sizeScale);
      } else {
        param[name] = val;
      }
    }
  });
  if (!param.width) {
    param.width = defaultWidthFunc;
  }
  if (!param.height) {
    param.height = defaultHeightFunc;
  }

  if (paramInfo.useMipmap != null) {
    param.useMipmap = paramInfo.useMipmap;
  }
  return param;
}

function loadTextures(json, lib, opts, callback) {
  if (!json.textures) {
    callback({});
    return;
  }
  const textures = {};
  const textureRootPath = opts.textureRootPath;
  let loading = 0;
  let cbd = false;
  util.each(json.textures, function (textureInfo, name) {
    let texture;
    let path = textureInfo.path;
    const parameters = convertParameter(textureInfo.parameters);
    if (Array.isArray(path) && path.length === 6) {
      if (textureRootPath) {
        path = path.map(function (item) {
          return util.relative2absolute(item, textureRootPath);
        });
      }
      texture = new TextureCube(parameters);
    } else if (typeof path === 'string') {
      if (textureRootPath) {
        path = util.relative2absolute(path, textureRootPath);
      }
      texture = new Texture2D(parameters);
    } else {
      return;
    }

    texture.load(path);
    loading++;
    texture.once('success', function () {
      textures[name] = texture;
      loading--;
      if (loading === 0) {
        callback(textures);
        cbd = true;
      }
    });
  });

  if (loading === 0 && !cbd) {
    callback(textures);
  }
}

function createSizeSetHandler(name, exprFunc) {
  return function (renderer) {
    // PENDING viewport size or window size
    const dpr = renderer.getDevicePixelRatio();
    // PENDING If multiply dpr ?
    const width = renderer.getWidth();
    const height = renderer.getHeight();
    const result = exprFunc(width, height, dpr);
    this.setParameter(name, result);
  };
}

function createSizeParser(name, exprFunc, scale) {
  scale = scale || 1;
  return function (renderer) {
    const dpr = renderer.getDevicePixelRatio();
    const width = renderer.getWidth() * scale;
    const height = renderer.getHeight() * scale;
    return exprFunc(width, height, dpr);
  };
}

function tryConvertExpr(string) {
  // PENDING
  const exprRes = /^expr\((.*)\)$/.exec(string);
  if (exprRes) {
    try {
      const func = new Function('width', 'height', 'dpr', 'return ' + exprRes[1]);
      // Try run t
      func(1, 1);

      return func;
    } catch (e) {
      throw new Error('Invalid expression.');
    }
  }
}

export default createCompositor;
