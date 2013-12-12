define(function(require) {
    
    'use strict';

    var Base = require('core/Base');
    var request = require('core/request');
    var Compositor = require('3d/compositor/Compositor');
    var CompoNode = require('3d/compositor/Node');
    var CompoGroup = require('3d/compositor/Group');
    var CompoSceneNode = require('3d/compositor/SceneNode');
    var CompoTextureNode = require('3d/compositor/TextureNode');
    var Shader = require('3d/Shader');
    var Texture = require('3d/Texture');
    var Texture2D = require('3d/texture/Texture2D');
    var TextureCube = require('3d/texture/TextureCube');
    var _ = require('_');

    var shaderSourceReg = /#source\((.*?)\)/;
    var urlReg = /#url\((.*?)\)/;

    var FXLoader = Base.derive(function() {
        return {
            rootPath : "",
            textureRootPath : "",
            shaderRootPath : ""
        }
    }, {
        load : function(url) {
            var self = this;

            if (!this.rootPath) {
                this.rootPath = url.slice(0, url.lastIndexOf("/"));
            }

            request.get({
                url : url,
                onprogress : function(percent, loaded, total) {
                    self.trigger("progress", percent, loaded, total);
                },
                onerror : function(e) {
                    self.trigger("error", e);
                },
                responseType : "text",
                onload : function(data) {
                    return self.parse(JSON.parse(data));
                }
            });
        },

        parse : function(json) {
            var self = this;
            var compositor = new Compositor();

            var lib = {
                textures : {},
                shaders : {},
                parameters : {}
            }
            var afterLoad = function(shaderLib, textureLib) {
                for (var i = 0; i < json.nodes.length; i++) {
                    var nodeInfo = json.nodes[i];
                    var node = self._createNode(nodeInfo, lib);
                    if (node) {
                        compositor.add(node);
                    }
                    if (nodeInfo.output) {
                        compositor.addOutput(node);
                    }
                }

                self.trigger('success', compositor);
            }

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

        _createNode : function(nodeInfo, lib) {
            if (!nodeInfo.shader) {
                return;
            }
            var type = nodeInfo.type || 'processor';
            var shaderSource;
            var inputs;
            var outputs;

            if (type === 'processor') {
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
                        node : nodeInfo.inputs[name].node,
                        pin : nodeInfo.inputs[name].pin
                    }
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
            if (type === 'processor') {
                node = new CompoNode({
                    name : nodeInfo.name,
                    shader : shaderSource,
                    inputs : inputs,
                    outputs : outputs
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
                            }
                        }
                        node.setParameter(name, val);
                    }
                }
            }
            return node;
        },
        _convertParameter : function(paramInfo) {
            var param = {};
            if (!paramInfo) {
                return param;
            }
            ['type', 'minFilter', 'magFilter', 'wrapS', 'wrapT']
                .forEach(function(name) {
                    if (paramInfo[name] !== undefined) {
                        param[name] = Texture[paramInfo[name]];
                    }
                });
            ['width', 'height', 'useMipmap']
                .forEach(function(name) {
                    if (paramInfo[name] !== undefined) {
                        param[name] = paramInfo[name];
                    }
                });
            return param;
        },
        
        _loadShaders : function(json, callback) {
            if (!json.shaders) {
                callback({});
                return;
            }
            var shaders = {};
            var loading = 0;
            var cbd = false;
            _.each(json.shaders, function(shaderExp, name) {
                var res = urlReg.exec(shaderExp);
                if (res) {
                    var path = res[1];
                    path = this.shaderRootPath || this.rootPath + '/' + path;
                    loading++;
                    request.get({
                        url : path,
                        onload : function(shaderSource) {
                            shaders[name] = shaderSource;
                            Shader.import(shaderSource);
                            loading--;
                            if (loading === 0) {
                                callback(shaders);
                                cbd = true;
                            }
                        }
                    })
                } else {
                    shaders[name] = shaderExp;
                    Shader.import(shaderSource);
                }
            }, this);
            if (loading === 0 && !cbd) {
                callback(shaders);
            }
        },

        _loadTextures : function(json, lib, callback) {
            if (!json.textures) {
                callback({});
                return;
            }
            var textures = {};
            var loading = 0;

            var cbd = false;
            _.each(json.textures, function(textureInfo, name) {
                var texture;
                var path = textureInfo.path;
                var parameters = this._convertParameter(textureInfo.parameters);
                if (typeof(path) === 'array' && path.length === 6) {
                    texture = new TextureCube();
                } else if(typeof(path) === 'string') {
                    texture = new Texture2D();
                } else {
                    return;
                }

                texture.load(path);
                loading++;
                texture.on('load', function() {
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

    return FXLoader;
});