import Base from '../core/Base';
import request from '../core/request';
import util from '../core/util';
import Compositor from '../compositor/Compositor';
import CompoNode from '../compositor/Node';
import CompoSceneNode from '../compositor/SceneNode';
import CompoTextureNode from '../compositor/TextureNode';
import CompoFilterNode from '../compositor/FilterNode';
import Shader from '../Shader';
import Texture from '../Texture';
import Texture2D from '../Texture2D';
import TextureCube from '../TextureCube';

var shaderSourceReg = /#source\((.*?)\)/;
var urlReg = /#url\((.*?)\)/;

/**
 * @constructor qtek.loader.FX
 * @extends qtek.core.Base
 */
var FXLoader = Base.extend(
/** @lends qtek.loader.FX# */
{
    /**
     * @type {string}
     */
    rootPath: '',
    /**
     * @type {string}
     */
    textureRootPath: '',
    /**
     * @type {string}
     */
    shaderRootPath: '',

    /**
     * @type {qtek.Scene}
     */
    scene: null,

    /**
     * @type {qtek.Camera}
     */
    camera: null
},
/** @lends qtek.loader.FX.prototype */
{
    /**
     * @param  {string} url
     */
    load: function(url) {
        var self = this;

        if (!this.rootPath) {
            this.rootPath = url.slice(0, url.lastIndexOf('/'));
        }

        request.get({
            url: url,
            onprogress: function(percent, loaded, total) {
                self.trigger('progress', percent, loaded, total);
            },
            onerror: function(e) {
                self.trigger('error', e);
            },
            responseType: 'text',
            onload: function(data) {
                self.parse(JSON.parse(data));
            }
        });
    },

    /**
     * @param {Object} json
     * @return {qtek.compositor.Compositor}
     */
    parse: function(json) {
        var self = this;
        var compositor = new Compositor();

        var lib = {
            textures: {},
            shaders: {},
            parameters: {}
        };
        var afterLoad = function(shaderLib, textureLib) {
            for (var i = 0; i < json.nodes.length; i++) {
                var nodeInfo = json.nodes[i];
                var node = self._createNode(nodeInfo, lib);
                if (node) {
                    compositor.addNode(node);
                }
            }

            self.trigger('success', compositor);
        };

        for (var name in json.parameters) {
            var paramInfo = json.parameters[name];
            lib.parameters[name] = this._convertParameter(paramInfo);
        }
        this._loadShaders(json, function(shaderLib) {
            // TODO load texture asynchronous
            self._loadTextures(json, lib, function(textureLib) {
                lib.textures = textureLib;
                lib.shaders = shaderLib;
                afterLoad();
            });
        });

        return compositor;
    },

    _createNode: function(nodeInfo, lib) {
        var type = nodeInfo.type || 'filter';
        var shaderSource;
        var inputs;
        var outputs;

        if (type === 'filter') {
            var shaderExp = nodeInfo.shader.trim();
            var res = shaderSourceReg.exec(shaderExp);
            if (res) {
                shaderSource = Shader.source(res[1].trim());
            }
            else if (shaderExp.charAt(0) === '#') {
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
            for (var name in nodeInfo.inputs) {
                if (typeof nodeInfo.inputs[name] === 'string') {
                    inputs[name] = nodeInfo.inputs[name];
                }
                else {
                    inputs[name] = {
                        node: nodeInfo.inputs[name].node,
                        pin: nodeInfo.inputs[name].pin
                    };
                }
            }
        }
        if (nodeInfo.outputs) {
            outputs = {};
            for (var name in nodeInfo.outputs) {
                var outputInfo = nodeInfo.outputs[name];
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
                if (typeof(outputInfo.parameters) === 'string') {
                    var paramExp = outputInfo.parameters;
                    if (paramExp.charAt(0) === '#') {
                        outputs[name].parameters = lib.parameters[paramExp.substr(1)];
                    }
                }
                else if (outputInfo.parameters) {
                    outputs[name].parameters = this._convertParameter(outputInfo.parameters);
                }
            }
        }
        var node;
        if (type === 'scene') {
            node = new CompoSceneNode({
                name: nodeInfo.name,
                scene: this.scene,
                camera: this.camera,
                outputs: outputs
            });
        }
        else if (type === 'texture') {
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
                for (var name in nodeInfo.parameters) {
                    var val = nodeInfo.parameters[name];
                    if (typeof(val) === 'string') {
                        val = val.trim();
                        if (val.charAt(0) === '#') {
                            val = lib.textures[val.substr(1)];
                        }
                        else {
                            node.on(
                                'beforerender', createSizeSetHandler(
                                    name, tryConvertExpr(val)
                                )
                            );
                        }
                    }
                    node.setParameter(name, val);
                }
            }
            if (nodeInfo.defines && node.pass) {
                for (var name in nodeInfo.defines) {
                    var val = nodeInfo.defines[name];
                    node.pass.material.shader.define('fragment', name, val);
                }
            }
        }
        return node;
    },

    _convertParameter: function(paramInfo) {
        var param = {};
        if (!paramInfo) {
            return param;
        }
        ['type', 'minFilter', 'magFilter', 'wrapS', 'wrapT', 'flipY', 'useMipmap']
            .forEach(function(name) {
                var val = paramInfo[name];
                if (val != null) {
                    // Convert string to enum
                    if (typeof val === 'string') {
                        val = Texture[val];
                    }
                    param[name] = val;
                }
            });
        ['width', 'height']
            .forEach(function(name) {
                if (paramInfo[name] != null) {
                    var val = paramInfo[name];
                    if (typeof val === 'string') {
                        val = val.trim();
                        param[name] = createSizeParser(
                            name, tryConvertExpr(val)
                        );
                    }
                    else {
                        param[name] = val;
                    }
                }
            });
        if (paramInfo.useMipmap != null) {
            param.useMipmap = paramInfo.useMipmap;
        }
        return param;
    },

    _loadShaders: function(json, callback) {
        if (!json.shaders) {
            callback({});
            return;
        }
        var shaders = {};
        var loading = 0;
        var cbd = false;
        var shaderRootPath = this.shaderRootPath || this.rootPath;
        util.each(json.shaders, function(shaderExp, name) {
            var res = urlReg.exec(shaderExp);
            if (res) {
                var path = res[1];
                path = util.relative2absolute(path, shaderRootPath);
                loading++;
                request.get({
                    url: path,
                    onload: function(shaderSource) {
                        shaders[name] = shaderSource;
                        Shader['import'](shaderSource);
                        loading--;
                        if (loading === 0) {
                            callback(shaders);
                            cbd = true;
                        }
                    }
                });
            }
            else {
                shaders[name] = shaderExp;
                // Try import shader
                Shader['import'](shaderExp);
            }
        }, this);
        if (loading === 0 && !cbd) {
            callback(shaders);
        }
    },

    _loadTextures: function(json, lib, callback) {
        if (!json.textures) {
            callback({});
            return;
        }
        var textures = {};
        var loading = 0;

        var cbd = false;
        var textureRootPath = this.textureRootPath || this.rootPath;
        util.each(json.textures, function(textureInfo, name) {
            var texture;
            var path = textureInfo.path;
            var parameters = this._convertParameter(textureInfo.parameters);
            if (Array.isArray(path) && path.length === 6) {
                path = path.map(function(item) {
                    return util.relative2absolute(item, textureRootPath);
                });
                texture = new TextureCube(parameters);
            }
            else if(typeof path === 'string') {
                path = util.relative2absolute(path, textureRootPath);
                texture = new Texture2D(parameters);
            }
            else {
                return;
            }

            texture.load(path);
            loading++;
            texture.once('success', function() {
                textures[name] = texture;
                loading--;
                if (loading === 0) {
                    callback(textures);
                    cbd = true;
                }
            });
        }, this);

        if (loading === 0 && !cbd) {
            callback(textures);
        }
    }
});

function createSizeSetHandler(name, exprFunc) {
    return function (renderer) {
        // PENDING viewport size or window size
        var dpr = renderer.getDevicePixelRatio();
        // PENDING If multiply dpr ?
        var width = renderer.getWidth();
        var height = renderer.getHeight();
        var result = exprFunc(width, height, dpr);
        this.setParameter(name, result);
    };
}

function createSizeParser(name, exprFunc) {
    return function (renderer) {
        var dpr = renderer.getDevicePixelRatio();
        var width = renderer.getWidth();
        var height = renderer.getHeight();
        return exprFunc(width, height, dpr);
    };
}

function tryConvertExpr(string) {
    // PENDING
    var exprRes = /^expr\((.*)\)$/.exec(string);
    if (exprRes) {
        try {
            var func = new Function('width', 'height', 'dpr', 'return ' + exprRes[1]);
            // Try run t
            func(1, 1);

            return func;
        }
        catch (e) {
            throw new Error('Invalid expression.');
        }
    }
}

export default FXLoader;
