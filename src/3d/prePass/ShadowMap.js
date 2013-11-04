define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var Shader = require("../Shader");
    var Light = require("../Light");
    var Mesh = require("../Mesh");
    var SpotLight = require("../light/Spot");
    var DirectionalLight = require("../light/Directional");
    var PointLight = require("../light/Point");
    var shaderLibrary = require("../shader/library");
    var Material = require("../Material");
    var FrameBuffer = require("../FrameBuffer");
    var Texture2D = require("../texture/Texture2D");
    var TextureCube = require("../texture/TextureCube");
    var glenum = require("../glenum");
    var PerspectiveCamera = require("../camera/Perspective");
    var OrthoCamera = require("../camera/Orthographic");

    var Pass = require("../compositor/Pass");
    var texturePool = require("../compositor/texturePool");

    var Matrix4 = require("core/Matrix4");

    var _ = require("_");

    var frameBuffer = new FrameBuffer();

    Shader.import(require('text!./shadowmap.essl'));

    var ShadowMapPlugin = Base.derive(function() {
        return {
            useVSM : false,

            _textures : {},

            _cameras : {},

            _shadowMapNumber : {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0
            },

            _meshMaterials : {},
            _depthMaterials : {},
            _distanceMaterials : {},

            _meshCastShadow : [],
            _lightCastShadow : [],
            _meshReceiveShadow : []

        }
    }, function() {
        // Gaussian filter pass for VSM
        this._gaussianPassH = new Pass({
            fragment : Shader.source('buildin.compositor.gaussian_blur_h')
        });
        this._gaussianPassV = new Pass({
            fragment : Shader.source('buildin.compositor.gaussian_blur_v')
        });
        this._gaussianPassH.setUniform("blurSize", 0.5);
        this._gaussianPassV.setUniform("blurSize", 0.5);

        this._outputDepthPass = new Pass({
            fragment : Shader.source('buildin.sm.debug_depth')
        });
        if (this.useVSM) {
            this._outputDepthPass.material.shader.define("fragment", "USE_VSM");
        }
    }, {

        render : function(renderer, scene) {
            this.trigger('beforerender', [this, renderer, scene]);
            this._renderShadowPass(renderer, scene);
            this.trigger('afterrender', [this, renderer, scene]);
        },

        renderDebug : function(renderer) {
            var viewportInfo = renderer.viewportInfo;
            var x = 0, y = 0;
            var width = viewportInfo.width / 4;
            var height = width;
            for (var name in this._textures) {
                renderer.setViewport(x, y, width, height);
                this._outputDepthPass.setUniform('depthMap', this._textures[name]);
                this._outputDepthPass.render(renderer);
                x += width;
            }
            renderer.setViewport(viewportInfo);
        },

        _bindDepthMaterial : function(renderQueue) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                var depthMaterial = this._depthMaterials[mesh.joints.length];
                if (mesh.material !== depthMaterial) {
                    if (!depthMaterial) {
                        // Skinned mesh
                        depthMaterial = new Material({
                            shader : new Shader({
                                vertex : Shader.source("buildin.sm.depth.vertex"),
                                fragment : Shader.source("buildin.sm.depth.fragment")
                            })
                        });
                        if (mesh.skeleton) {
                            depthMaterial.shader.define('vertex', 'SKINNING');
                            depthMaterial.shader.define('vertex', 'JOINT_NUMBER', mesh.joints.length);   
                        }
                        this._depthMaterials[mesh.joints.length] = depthMaterial;
                    }

                    this._meshMaterials[mesh.__GUID__] = mesh.material;
                    mesh.material = depthMaterial;

                    if (this.useVSM) {
                        depthMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        depthMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                }
            }
        },

        _bindDistanceMaterial : function(renderQueue, light) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                var distanceMaterial = this._distanceMaterials[mesh.joints.length];
                if (mesh.material !== distanceMaterial) {
                    if (!distanceMaterial) {
                        // Skinned mesh
                        distanceMaterial = new Material({
                            shader : new Shader({
                                vertex : Shader.source("buildin.sm.distance.vertex"),
                                fragment : Shader.source("buildin.sm.distance.fragment")
                            })
                        });
                        if (mesh.skeleton) {
                            distanceMaterial.shader.define('vertex', 'SKINNING');
                            distanceMaterial.shader.define('vertex', 'JOINT_NUMBER', mesh.joints.length);   
                        }
                        this._distanceMaterials[mesh.joints.length] = distanceMaterial;
                    }

                    this._meshMaterials[mesh.__GUID__] = mesh.material;
                    mesh.material = distanceMaterial;

                    if (this.useVSM) {
                        distanceMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        distanceMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                    distanceMaterial.set("lightPosition", light.position._array);
                    distanceMaterial.set("range", light.range * 5);
                }
            }
        },

        _restoreMaterial : function(renderQueue) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                mesh.material = this._meshMaterials[mesh.__GUID__];
            }
        },

        _update : function(parent) {
            for (var i = 0; i < parent._children.length; i++) {
                var child = parent._children[i];
                if (!child.visible) {
                    continue;
                }
                if (child.material && child.material.shader) {
                    if (child.castShadow) {
                        this._meshCastShadow.push(child);
                    }
                    if (child.receiveShadow) {
                        this._meshReceiveShadow.push(child);
                        child.material.set('shadowEnabled', 1);
                    } else {
                        child.material.set('shadowEnabled', 0);
                    }
                    if (this.useVSM) {
                        child.material.shader.define('fragment', 'USE_VSM');
                    } else {
                        child.material.shader.unDefine('fragment', 'USE_VSM');
                    }
                } else if (child instanceof Light) {
                    if (child.castShadow) {
                        this._lightCastShadow.push(child);
                    }
                }

                if (child._children.length > 0) {
                    this._update(child);
                }
            }
        },

        _renderShadowPass : function(renderer, scene) {
            var self = this;

            // reset
            for (var name in this._shadowMapNumber) {
                this._shadowMapNumber[name] = 0;
            }
            this._lightCastShadow.length = 0;
            this._meshCastShadow.length = 0;
            this._meshReceiveShadow.length = 0;
            var renderQueue = this._meshCastShadow;

            var _gl = renderer.gl;

            scene.update();

            this._update(scene);

            _gl.enable(_gl.DEPTH_TEST);
            _gl.depthMask(true);
            _gl.disable(_gl.BLEND);

            _gl.clearColor(0.0, 0.0, 0.0, 0.0);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
            var targetMap = {
                'px' : _gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                'py' : _gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                'pz' : _gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                'nx' : _gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                'ny' : _gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                'nz' : _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            }
            var cursor = 0;

            // Shadow uniforms
            var spotLightShadowMaps = [];
            var spotLightMatrices = [];
            var spotLightBiases = [];
            var directionalLightShadowMaps = [];
            var directionalLightMatrices = [];
            var directionalLightBiases = [];
            var pointLightShadowMaps = [];
            var pointLightRanges = [];

            // Create textures for shadow map
            for (var i = 0; i < this._lightCastShadow.length; i++) {
                var light = this._lightCastShadow[i];
                if (light instanceof SpotLight ||
                    light instanceof DirectionalLight) {
                    
                    this._bindDepthMaterial(renderQueue);

                    var texture = this._getTexture(light.__GUID__, light);
                    var camera = this._getCamera(light.__GUID__, light);

                    frameBuffer.attach(renderer.gl, texture);
                    frameBuffer.bind(renderer);

                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                    renderer._scene = scene;
                    renderer.renderQueue(renderQueue, camera, null, true);

                    frameBuffer.unbind(renderer);

                    // Filter for VSM
                    if (this.useVSM) {
                        this._gaussianFilter(renderer, texture, 512);
                    }
        
                    var matrix = new Matrix4();
                    matrix.copy(camera.worldTransform)
                        .invert()
                        .multiplyLeft(camera.projectionMatrix);

                    if (light instanceof SpotLight) {
                        spotLightShadowMaps.push(texture);
                        spotLightMatrices.push(matrix._array);
                        spotLightBiases.push(light.shadowBias);
                    } else {
                        directionalLightShadowMaps.push(texture);
                        directionalLightMatrices.push(matrix._array);
                        directionalLightBiases.push(light.shadowBias);
                    }

                } else if (light instanceof PointLight) {
                    
                    var texture = this._getTexture(light.__GUID__, light);
                    pointLightShadowMaps.push(texture);
                    pointLightRanges.push(light.range * 5);

                    this._bindDistanceMaterial(renderQueue, light);
                    for (var i = 0; i < 6; i++) {
                        var target = targets[i];
                        var camera = this._getCamera(light.__GUID__, light, target);

                        frameBuffer.attach(renderer.gl, texture, _gl.COLOR_ATTACHMENT0, targetMap[target]);
                        frameBuffer.bind(renderer);

                        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                        renderer._scene = scene;

                        renderer.renderQueue(renderQueue, camera, null, true);

                        frameBuffer.unbind(renderer);
                    }

                }

                this._shadowMapNumber[light.type]++;
            };

            this._restoreMaterial(renderQueue);

            for (var i = 0; i < this._meshReceiveShadow.length; i++) {
                var mesh = this._meshReceiveShadow[i];
                var material = mesh.material;

                var shader = material.shader;

                var shaderNeedsUpdate = false;
                for (var name in this._shadowMapNumber) {
                    var number = this._shadowMapNumber[name];
                    var key = name + "_SHADOWMAP_NUMBER";

                    if (shader.fragmentDefines[key] !== number &&
                        number > 0) {
                        shader.fragmentDefines[key] = number;
                        shaderNeedsUpdate = true;
                    }
                }
                if (shaderNeedsUpdate) {
                    shader.dirty();
                }

                material.set({
                    "spotLightShadowMaps" : spotLightShadowMaps,
                    "spotLightMatrices" : spotLightMatrices,
                    "spotLightBiases" : spotLightBiases,
                    "directionalLightShadowMaps" : directionalLightShadowMaps,
                    "directionalLightBiases" : directionalLightBiases,
                    "directionalLightMatrices" : directionalLightMatrices,
                    "pointLightShadowMaps" : pointLightShadowMaps,
                    "pointLightRanges" : pointLightRanges
                });
            }
        },

        _gaussianFilter : function(renderer, texture, size) {
            var parameter = {
                width : size,
                height : size,
                type : glenum.FLOAT,
                wrapS : glenum.MIRRORED_REPEAT,
                wrapT : glenum.MIRRORED_REPEAT
            };
            var _gl = renderer.gl;
            var tmpTexture = texturePool.get(parameter);
            
            frameBuffer.attach(_gl, tmpTexture);
            frameBuffer.bind(renderer);
            this._gaussianPassH.setUniform("texture", texture);
            this._gaussianPassH.setUniform("imageHeight", size);
            this._gaussianPassH.render(renderer);
            frameBuffer.unbind(renderer);

            frameBuffer.attach(_gl, texture);
            frameBuffer.bind(renderer);
            this._gaussianPassV.setUniform("texture", tmpTexture);
            this._gaussianPassV.setUniform("imageWidth", size);
            this._gaussianPassV.render(renderer);
            frameBuffer.unbind(renderer);

            texturePool.put(tmpTexture);
        },

        _getTexture : function(key, light) {
            var texture = this._textures[key];
            var resolution = light.shadowResolution || 512;
            var needsUpdate = false;
            if (texture) {
                if (texture.width !== resolution) {
                    texture.dispose();
                    needsUpdate = true;
                }
            } else{
                needsUpdate = true;
            }
            if (needsUpdate) {
                if (light instanceof PointLight) {
                    texture = new TextureCube();
                } else {
                    texture = new Texture2D();
                }
                texture.width = resolution;
                texture.height = resolution;
                if (this.useVSM) {
                    texture.wrapT = glenum.MIRRORED_REPEAT;
                    texture.wrapS = glenum.MIRRORED_REPEAT;
                    texture.type = glenum.FLOAT;
                } else {
                    texture.minFilter = glenum.NEAREST;
                    texture.magFilter = glenum.NEAREST;
                    texture.useMipmap = false;
                }
                this._textures[key] = texture;
            }

            return texture;
        },

        _getCamera : function(key, light, target) {
            var camera = this._cameras[key];
            if (target && !camera) {
                camera = this._cameras[key] = {};
            }
            if (target) {
                camera = camera[target];   
            }
            if (!camera) {
                if (light instanceof SpotLight ||
                    light instanceof PointLight) {
                    camera = new PerspectiveCamera({
                        near : 0.1
                    });
                } else if (light instanceof DirectionalLight) {
                    camera = new OrthoCamera(light.shadowCamera);
                }
                if (target) {
                    this._cameras[key][target] = camera;
                } else {
                    this._cameras[key] = camera;
                }
            }
            if (light instanceof SpotLight) {
                // Update properties
                camera.fov = light.penumbraAngle * 2;
                camera.far = light.range;
            }
            if (light instanceof PointLight) {
                camera.far = light.range;
                camera.fov = 90;

                camera.position.set(0, 0, 0);
                switch (target) {
                    case 'px':
                        camera.lookAt(px, ny);
                        break;
                    case 'nx':
                        camera.lookAt(nx, ny);
                        break;
                    case 'py':
                        camera.lookAt(py, pz);
                        break;
                    case 'ny':
                        camera.lookAt(ny, nz);
                        break;
                    case 'pz':
                        camera.lookAt(pz, ny);
                        break;
                    case 'nz':
                        camera.lookAt(nz, ny);
                        break;
                }
                camera.position.copy(light.position);
                camera.update();

            }else{
                camera.worldTransform.copy(light.worldTransform);
            }
            camera.updateProjectionMatrix();

            return camera;
        },

        dispose : function(renderer) {
            var _gl = renderer;
    
            for (var guid in this._depthMaterials) {
                var mat = this._depthMaterials[guid];
                mat.dispose();
            }
            for (var guid in this._distanceMaterials) {
                var mat = this._distanceMaterials[guid];
                mat.dispose();
            }

            for (var name in this._textures) {
                this._textures[name].dispose(_gl);
            }

            this._depthMaterials = {};
            this._distanceMaterials = {};
            this._textures = {};
            this._cameras = {};
            this._shadowMapNumber = {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0
            };
            this._meshMaterials = {};

        }
    });
    
    var px = new Vector3(1, 0, 0);
    var nx = new Vector3(-1, 0, 0);
    var py = new Vector3(0, 1, 0);
    var ny = new Vector3(0, -1, 0);
    var pz = new Vector3(0, 0, 1);
    var nz = new Vector3(0, 0, -1);

    return ShadowMapPlugin;
})