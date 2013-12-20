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

    var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    var targetMap = {
        'px' : glenum.TEXTURE_CUBE_MAP_POSITIVE_X,
        'py' : glenum.TEXTURE_CUBE_MAP_POSITIVE_Y,
        'pz' : glenum.TEXTURE_CUBE_MAP_POSITIVE_Z,
        'nx' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_X,
        'ny' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        'nz' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    }

    var ShadowMapPass = Base.derive(function() {
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
        this._gaussianPassH.setUniform("blurSize", 1.0);
        this._gaussianPassV.setUniform("blurSize", 1.0);

        this._outputDepthPass = new Pass({
            fragment : Shader.source('buildin.sm.debug_depth')
        });
        if (this.useVSM) {
            this._outputDepthPass.material.shader.define("fragment", "USE_VSM");
        }
    }, {

        render : function(renderer, scene) {
            this.trigger('beforerender', this, renderer, scene);
            this._renderShadowPass(renderer, scene);
            this.trigger('afterrender', this, renderer, scene);
        },

        renderDebug : function(renderer) {
            var prevClear = renderer.clear;
            renderer.clear = glenum.DEPTH_BUFFER_BIT
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
            renderer.clear = prevClear;
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
                        if (mesh.joints.length > 0) {
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
                        if (mesh.joints.length > 0) {
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
                        child.material.__shadowUniformUpdated = false;
                        child.material.shader.__shadowDefineUpdated = false;
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

            if (!this._lightCastShadow.length) {
                return;
            }

            _gl.enable(_gl.DEPTH_TEST);
            _gl.depthMask(true);
            _gl.disable(_gl.BLEND);

            _gl.clearColor(0.0, 0.0, 0.0, 0.0);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

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
                if (material.__shadowUniformUpdated) {
                    continue;
                }
                var shader = material.shader;

                if (!shader.__shadowDefineUpdated) {
                    var shaderNeedsUpdate = false;
                    for (var lightType in this._shadowMapNumber) {
                        var number = this._shadowMapNumber[lightType];
                        var key = lightType + "_SHADOWMAP_NUMBER";

                        if (shader.fragmentDefines[key] !== number && number > 0) {
                            shader.fragmentDefines[key] = number;
                            shaderNeedsUpdate = true;
                        }
                    }
                    if (shaderNeedsUpdate) {
                        shader.dirty();
                    }
                    shader.__shadowDefineUpdated = true;
                }

                material.setUniform("spotLightShadowMaps", spotLightShadowMaps);
                material.setUniform("spotLightMatrices", spotLightMatrices);
                material.setUniform("spotLightBiases", spotLightBiases);
                material.setUniform("directionalLightShadowMaps", directionalLightShadowMaps);
                material.setUniform("directionalLightBiases", directionalLightBiases);
                material.setUniform("directionalLightMatrices", directionalLightMatrices);
                material.setUniform("pointLightShadowMaps", pointLightShadowMaps);
                material.setUniform("pointLightRanges", pointLightRanges);
                material.__shadowUniformUpdated = true;
            }
        },

        _gaussianFilter : function(renderer, texture, size) {
            var parameter = {
                width : size,
                height : size,
                type : glenum.FLOAT
            };
            var _gl = renderer.gl;
            var tmpTexture = texturePool.get(parameter);
            
            frameBuffer.attach(_gl, tmpTexture);
            frameBuffer.bind(renderer);
            this._gaussianPassH.setUniform("texture", texture);
            this._gaussianPassH.setUniform("textureHeight", size);
            this._gaussianPassH.render(renderer);
            frameBuffer.unbind(renderer);

            frameBuffer.attach(_gl, texture);
            frameBuffer.bind(renderer);
            this._gaussianPassV.setUniform("texture", tmpTexture);
            this._gaussianPassV.setUniform("textureWidth", size);
            this._gaussianPassV.render(renderer);
            frameBuffer.unbind(renderer);

            texturePool.put(tmpTexture);
        },

        _getTexture : function(key, light) {
            var texture = this._textures[key];
            var resolution = light.shadowResolution || 512;
            if (!texture) {
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
                    texture.anisotropic = 4;
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
                        camera.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
                        break;
                    case 'nx':
                        camera.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
                        break;
                    case 'py':
                        camera.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
                        break;
                    case 'ny':
                        camera.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
                        break;
                    case 'pz':
                        camera.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
                        break;
                    case 'nz':
                        camera.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);
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

        dispose : function(_gl) {
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

            for (var i = 0; i < this._meshReceiveShadow.length; i++) {
                var mesh = this._meshReceiveShadow[i];
                var material = mesh.material;
                var shader = material.shader;
                shader.unDefine('fragment', 'POINT_LIGHT_SHADOW_NUMBER');
                shader.unDefine('fragment', 'DIRECTIONAL_LIGHT_SHADOW_NUMBER');
                shader.unDefine('fragment', 'AMBIENT_LIGHT_SHADOW_NUMBER');
                material.set('shadowEnabled', 0);
            }

            this._meshCastShadow = [];
            this._meshReceiveShadow = [];
            this._lightCastShadow = [];
        }
    });
    
    return ShadowMapPass;
})