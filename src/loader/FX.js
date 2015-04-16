define(function(require) {
    
    'use strict';

    var Base = require('../core/Base');
    var request = require('../core/request');
    var util = require('../core/util');
    var Compositor = require('../compositor/Compositor');
    var CompoNode = require('../compositor/Node');
    var Shader = require('../Shader');
    var Texture = require('../Texture');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');

    var shaderSourceReg = /#source\((.*?)\)/;
    var urlReg = /#url\((.*?)\)/;

    /**
     * @constructor qtek.loader.FX
     * @extends qtek.core.Base
     */
    var FXLoader = Base.derive(
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
        shaderRootPath: ''
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
                    if (nodeInfo.output) {
                        compositor.addOutput(node);
                    }
                }

                self.trigger('success', compositor);
            };

            for (var name in json.parameters) {
                var paramInfo = json.parameters[name];
                lib.parameters[name] = this._convertParameter(paramInfo);
            }
            this._loadShaders(json, function(shaderLib) {
                self._loadTextures(json, lib, function(textureLib) {
                    lib.textures = textureLib;
                    lib.shaders = shaderLib;
                    afterLoad();
                });
            });

            return compositor;
        },

        _createNode: function(nodeInfo, lib) {
            if (!nodeInfo.shader) {
                return;
            }
            var type = nodeInfo.type || 'filter';
            var shaderSource;
            var inputs;
            var outputs;

            if (type === 'filter') {
                var shaderExp = nodeInfo.shader.trim();
                var res = shaderSourceReg.exec(shaderExp);
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
                for (var name in nodeInfo.inputs) {
                    inputs[name] = {
                        node: nodeInfo.inputs[name].node,
                        pin: nodeInfo.inputs[name].pin
                    };
                }
            }
            if (nodeInfo.outputs) {
                outputs = {};
                for (var name in nodeInfo.outputs) {
                    var outputInfo = nodeInfo.outputs[name];
                    outputs[name] = {};
                    if (outputInfo.attachment !== undefined) {
                        outputs[name].attachment = outputInfo.attachment;
                    }
                    if (outputInfo.keepLastFrame !== undefined) {
                        outputs[name].keepLastFrame = outputInfo.keepLastFrame;
                    }
                    if (outputInfo.outputLastFrame !== undefined) {
                        outputs[name].outputLastFrame = outputInfo.outputLastFrame;
                    }
                    if (typeof(outputInfo.parameters) === 'string') {
                        var paramExp = outputInfo.parameters;
                        if (paramExp.charAt(0) === '#') {
                            outputs[name].parameters = lib.parameters[paramExp.substr(1)];
                        }
                    } else if (outputInfo.parameters) {
                        outputs[name].parameters = this._convertParameter(outputInfo.parameters);
                    }
                }   
            }
            var node;
            if (type === 'filter') {
                node = new CompoNode({
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
                            if (val.charAt(0) === '#'){
                                val = lib.textures[val.substr(1)];
                            } else if (val.match(/%width$/)) {
                                node.on('beforerender', createWidthSetHandler(name, val));
                                continue;
                            } else if (val.match(/%height$/)) {
                                node.on('beforerender', createHeightSetHandler(name, val));
                                continue;
                            }
                        } else if (val instanceof Array) {
                            if (
                                typeof(val[0]) === 'string' && typeof(val[1]) === 'string'
                                && (val[0].match(/%width$/))
                                && (val[1].match(/%height$/))
                            ) {
                                node.on('beforerender', createSizeSetHandler(name, val));
                                continue;
                            }
                        }
                        node.setParameter(name, val);
                    }
                }
                if (nodeInfo.defines) {
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
            ['type', 'minFilter', 'magFilter', 'wrapS', 'wrapT']
                .forEach(function(name) {
                    var val = paramInfo[name];
                    if (val !== undefined) {
                        // Convert string to enum
                        if (typeof(val) === 'string') {
                            val = Texture[val];
                        }
                        param[name] = val;
                    }
                });
            ['width', 'height']
                .forEach(function(name) {
                    if (paramInfo[name] !== undefined) {
                        var val = paramInfo[name];
                        if (typeof val === 'string') {
                            val = val.trim();
                            if (val.match(/%width$/)) {
                                param[name] = percentToWidth.bind(null, parseFloat(val));
                            }
                            else if (val.match(/%height$/)) {
                                param[name] = percentToHeight.bind(null, parseFloat(val));
                            }
                        } else {
                            param[name] = val;
                        }
                    }
                });
            if (paramInfo.useMipmap !== undefined) {
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
                } else {
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
                if (path instanceof Array && path.length === 6) {
                    path = path.map(function(item) {
                        return util.relative2absolute(item, textureRootPath);
                    });
                    texture = new TextureCube(parameters);
                } else if(typeof(path) === 'string') {
                    path = util.relative2absolute(path, textureRootPath);
                    texture = new Texture2D(parameters);
                } else {
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

    function createWidthSetHandler(name, val) {
        val = parseFloat(val);
        return function (renderer) {
            this.setParameter(name, percentToWidth(val, renderer));
        };
    }
    function createHeightSetHandler(name, val) {
        val = parseFloat(val);
        return function (renderer) {
            this.setParameter(name, percentToWidth(val, renderer));
        };
    }

    function createSizeSetHandler(name, val) {
        val[0] = parseFloat(val[0]);
        val[1] = parseFloat(val[1]);
        return function (renderer) {
            this.setParameter(name, [percentToWidth(val[0], renderer), percentToHeight(val[0], renderer)]);
        };
    }

    function percentToWidth(percent, renderer) {
        return percent / 100 * renderer.getWidth();
    }

    function percentToHeight(percent, renderer) {
        return percent / 100 * renderer.getHeight();
    }

    return FXLoader;
});