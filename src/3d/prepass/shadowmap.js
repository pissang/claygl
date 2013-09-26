/**
 * @export{class} ShadowMap
 */
define(function(require) {

    var Base = require("core/base");
    var Vector3 = require("core/vector3");
    var Shader = require("../shader");
    var Light = require("../light");
    var SpotLight = require("../light/spot");
    var DirectionalLight = require("../light/directional");
    var PointLight = require("../light/point");
    var shaderLibrary = require("../shader/library");
    var Material = require("../material");
    var FrameBuffer = require("../framebuffer");
    var Texture2d = require("../texture/texture2d");
    var TextureCube = require("../texture/texturecube");
    var glenum = require("../glenum");
    var PerspectiveCamera = require("../camera/perspective");
    var OrthoCamera = require("../camera/orthographic");

    var Pass = require("../compositor/pass");
    var texturePool = require("../compositor/texturepool");

    var Matrix4 = require("core/matrix4");

    var _ = require("_");

    var frameBuffer = new FrameBuffer();

    Shader.import(require('text!./shadowmap.essl'));

    var ShadowMapPlugin = Base.derive(function() {
        return {
            _textures : {},

            _cameras : {},

            _shadowMapNumber : {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0
            },

            _materialPreserve : {},

            useVSM : false
        }
    }, function() {

        this._depthMaterial =  new Material({
            shader : new Shader({
                vertex : Shader.source("buildin.sm.depth.vertex"),
                fragment : Shader.source("buildin.sm.depth.fragment")
            })
        });
        // Point light write the distance instance of depth projected
        // http://http.developer.nvidia.com/GPUGems/gpugems_ch12.html
        this._distanceMaterial = new Material({
            shader : new Shader({
                vertex : Shader.source("buildin.sm.distance.vertex"),
                fragment : Shader.source("buildin.sm.distance.fragment")
            })
        });

        // Gaussian filter pass for VSM
        this._gaussianPassH = new Pass({
            fragment : Shader.source('buildin.compositor.gaussian_blur_h')
        });
        this._gaussianPassV = new Pass({
            fragment : Shader.source('buildin.compositor.gaussian_blur_v')
        });
        this._gaussianPassH.setUniform("blurSize", 3.0);
        this._gaussianPassV.setUniform("blurSize", 3.0);
    }, {

        render : function(renderer, scene) {
            this._renderShadowPass(renderer, scene);
        },

        _bindDepthMaterial : function(renderQueue) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                if (mesh.material !== mesh._depthMaterial) {
                    if (!mesh._depthMaterial) {
                        // Skinned mesh
                        if (mesh.skeleton) {
                            mesh._depthMaterial = new Material({
                                shader : new Shader({
                                    vertex : Shader.source("buildin.sm.depth.vertex"),
                                    fragment : Shader.source("buildin.sm.depth.fragment")
                                })
                            });
                            mesh._depthMaterial.shader.define('vertex', 'SKINNING');
                            mesh._depthMaterial.shader.define('vertex', 'JOINT_NUMBER', mesh.skeleton.getBoneNumber());
                        } else {
                            mesh._depthMaterial = this._depthMaterial;
                        }
                    }

                    this._materialPreserve[mesh.__GUID__] = mesh.material;
                    mesh.material = mesh._depthMaterial;

                    if (this.useVSM) {
                        mesh._depthMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        mesh._depthMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                }
            }
        },

        _bindDistanceMaterial : function(renderQueue) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                if (mesh.material !== mesh._distanceMaterial) {
                    if (!mesh._distanceMaterial) {
                        // Skinned mesh
                        if (mesh.skeleton) {
                            mesh._distanceMaterial = new Material({
                                shader : new Shader({
                                    vertex : Shader.source("buildin.sm.distance.vertex"),
                                    fragment : Shader.source("buildin.sm.distance.fragment")
                                })
                            });
                            mesh._distanceMaterial.shader.define('vertex', 'SKINNING');
                            mesh._distanceMaterial.shader.define('vertex', 'JOINT_NUMBER', mesh.skeleton.getBoneNumber());
                        } else {
                            mesh._distanceMaterial = this._distanceMaterial;
                        }
                    }

                    this._materialPreserve[mesh.__GUID__] = mesh.material;
                    mesh.material = mesh._distanceMaterial;

                    if (this.useVSM) {
                        mesh._distanceMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        mesh._distanceMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                }
            }
        },

        _restoreMaterial : function(renderQueue) {
            for (var i = 0; i < renderQueue.length; i++) {
                var mesh = renderQueue[i];
                mesh.material = this._materialPreserve[mesh.__GUID__];
            }
        },

        _renderShadowPass : function(renderer, scene) {
            var self = this;
            var renderQueue = [],
                lightCastShadow = [],
                meshReceiveShadow = [];

            var _gl = renderer.gl;

            scene.update();

            scene.traverse(function(node) {
                if (node.instanceof(Light)) {
                    if (node.castShadow) {
                        lightCastShadow.push(node);
                    }
                }
                if (node.material && node.material.shader) {
                    if (node.castShadow) {
                        renderQueue.push(node);
                    }
                    if (node.receiveShadow) {
                        meshReceiveShadow.push(node);
                        node.material.set("shadowEnabled", 1);
                    }else{
                        node.material.set("shadowEnabled", 0);
                    }
                    if (self.useVSM) {
                        node.material.shader.define("fragment", "USE_VSM");
                    } else {
                        node.material.shader.unDefine("fragment", "USE_VSM");
                    }
                };
            });

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
            var spotLightShadowMaps = [],
                spotLightMatrices = [],
                spotLightBiases = [],
                directionalLightShadowMaps = [],
                directionalLightMatrices = [],
                directionalLightBiases = [],
                pointLightShadowMaps = [],
                pointLightRanges = [];

            // reset
            for (var name in this._shadowMapNumber) {
                this._shadowMapNumber[name] = 0;
            }
            // Create textures for shadow map
            _.each(lightCastShadow, function(light) {

                if (light.instanceof(SpotLight) ||
                    light.instanceof(DirectionalLight)) {
                    
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

                    if (light.instanceof(SpotLight)) {
                        spotLightShadowMaps.push(texture);
                        spotLightMatrices.push(matrix._array);
                        spotLightBiases.push(light.shadowBias);
                    } else {
                        directionalLightShadowMaps.push(texture);
                        directionalLightMatrices.push(matrix._array);
                        directionalLightBiases.push(light.shadowBias);
                    }

                } else if (light.instanceof(PointLight)) {
                    
                    var texture = this._getTexture(light.__GUID__, light);
                    pointLightShadowMaps.push(texture);
                    pointLightRanges.push(light.range * 5);

                    this._bindDistanceMaterial(renderQueue);
                    for (var i = 0; i < 6; i++) {
                        var target = targets[i];
                        var camera = this._getCamera(light.__GUID__, light, target);

                        frameBuffer.attach(renderer.gl, texture, _gl.COLOR_ATTACHMENT0, targetMap[target]);
                        frameBuffer.bind(renderer);

                        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                        renderer._scene = scene;
                        this._distanceMaterial.set("lightPosition", light.position._array);
                        this._distanceMaterial.set("range", light.range * 5);

                        renderer.renderQueue(renderQueue, camera, null, true);

                        frameBuffer.unbind(renderer);
                    }

                }

                this._shadowMapNumber[ light.type ] ++;
            }, this);

            this._restoreMaterial(renderQueue);

            for (var i = 0; i < meshReceiveShadow.length; i++) {
                var mesh = meshReceiveShadow[i],
                    material = mesh.material;

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
                type : glenum.FLOAT
            };
            var _gl = renderer.gl;
            var tmpTexture = texturePool.get(parameter);
            
            frameBuffer.attach(_gl, tmpTexture);
            frameBuffer.bind(renderer);
            this._gaussianPassH.setUniform("texture", texture);
            this._gaussianPassH.render(renderer);
            frameBuffer.unbind(renderer);

            frameBuffer.attach(_gl, texture);
            frameBuffer.bind(renderer);
            this._gaussianPassV.setUniform("texture", tmpTexture);
            this._gaussianPassV.render(renderer);
            frameBuffer.unbind(renderer);

            texturePool.put(tmpTexture);
        },

        _getTexture : function(key, light) {
            var texture = this._textures[ key ];
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
                if (light.instanceof(PointLight)) {
                    texture = new TextureCube({
                        width : resolution,
                        height : resolution,
                        minFilter : glenum.NEAREST,
                        magFilter : glenum.NEAREST,
                        useMipmap : false
                    });
                } else {
                    texture = new Texture2d({
                        width : resolution,
                        height : resolution,
                        
                        minFilter : glenum.NEAREST,
                        magFilter : glenum.NEAREST,
                        useMipmap : false
                    });
                }
                if (this.useVSM) {
                    texture.type = glenum.FLOAT;
                }
                this._textures[key] = texture;
            }

            return texture;
        },

        _getCamera : function(key, light, target) {
            var camera = this._cameras[ key ];
            if (target && !camera) {
                camera = this._cameras[key] = {};
            }
            if (target) {
                camera = camera[target];   
            }
            if (!camera) {
                if (light.instanceof(SpotLight) ||
                    light.instanceof(PointLight)) {
                    camera = new PerspectiveCamera({
                        near : 0.1
                    });
                } else if (light.instanceof(DirectionalLight)) {
                    camera = new OrthoCamera(light.shadowCamera);
                }
                if (target) {
                    this._cameras[key][target] = camera;
                } else {
                    this._cameras[key] = camera;
                }
            }
            if (light.instanceof(SpotLight)) {
                // Update properties
                camera.fov = light.penumbraAngle * 2;
                camera.far = light.range;
            }
            if (light.instanceof(PointLight)) {
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