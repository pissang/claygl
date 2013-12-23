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
    var BoundingBox = require("../BoundingBox");

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
            
            softShadow : ShadowMapPass.PCF,

            _textures : {},

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
            _meshReceiveShadow : [],

            _lightCameras : {}
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
        if (this.softShadow === ShadowMapPass.VSM) {
            this._outputDepthPass.material.shader.define("fragment", "USE_VSM");
        }
    }, {

        render : function(renderer, scene, sceneCamera) {
            this.trigger('beforerender', this, renderer, scene, sceneCamera);
            this._renderShadowPass(renderer, scene, sceneCamera);
            this.trigger('afterrender', this, renderer, scene, sceneCamera);
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

        _bindDepthMaterial : function(casts) {
            for (var i = 0; i < casts.length; i++) {
                var mesh = casts[i];
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

                    if (this.softShadow === ShadowMapPass.VSM) {
                        depthMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        depthMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                }
            }
        },

        _bindDistanceMaterial : function(casts, light) {
            for (var i = 0; i < casts.length; i++) {
                var mesh = casts[i];
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

                    if (this.softShadow === ShadowMapPass.VSM) {
                        distanceMaterial.shader.define("fragment", "USE_VSM");
                    } else {
                        distanceMaterial.shader.unDefine("fragment", "USE_VSM");
                    }
                    distanceMaterial.set("lightPosition", light.position._array);
                    distanceMaterial.set("range", light.range * 5);
                }
            }
        },

        _restoreMaterial : function(casts) {
            for (var i = 0; i < casts.length; i++) {
                var mesh = casts[i];
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
                    if (this.softShadow === ShadowMapPass.VSM) {
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

        _renderShadowPass : function(renderer, scene, sceneCamera) {
            var self = this;

            // reset
            for (var name in this._shadowMapNumber) {
                this._shadowMapNumber[name] = 0;
            }
            this._lightCastShadow.length = 0;
            this._meshCastShadow.length = 0;
            this._meshReceiveShadow.length = 0;

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
                if (light instanceof DirectionalLight) {
                    this._renderDirectionalLightShadow
                    (
                        renderer,
                        light,
                        scene,
                        sceneCamera,
                        this._meshCastShadow, 
                        directionalLightBiases,
                        directionalLightMatrices,
                        directionalLightShadowMaps
                    );
                } else if (light instanceof SpotLight) {
                    this._renderSpotLightShadow
                    (
                        renderer,
                        light,
                        this._meshCastShadow, 
                        spotLightBiases,
                        spotLightMatrices,
                        spotLightShadowMaps
                    );
                } else if (light instanceof PointLight) {
                    this._renderPointLightShadow
                    (
                        renderer,
                        light,
                        this._meshCastShadow,
                        pointLightRanges,
                        pointLightShadowMaps
                    )
                }

                this._shadowMapNumber[light.type]++;
            };

            this._restoreMaterial(this._meshCastShadow);

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

        _renderDirectionalLightShadow : function(renderer, light, scene, sceneCamera, casts, directionalLightBiases, directionalLightMatrices, directionalLightShadowMaps) {
            this._bindDepthMaterial(casts);

            var texture = this._getTexture(light.__GUID__, light);
            var camera = this._getDirectionalLightCamera(light, scene, sceneCamera);
            var _gl = renderer.gl;

            frameBuffer.attach(_gl, texture);
            frameBuffer.bind(renderer);

            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            renderer.renderQueue(casts, camera, null, true);

            frameBuffer.unbind(renderer);

            // Filter for VSM
            if (this.softShadow === ShadowMapPass.VSM) {
                this._gaussianFilter(renderer, texture, texture.width);
            }

            var matrix = new Matrix4();
            matrix.copy(camera.worldTransform)
                .invert()
                .multiplyLeft(camera.projectionMatrix);

            directionalLightShadowMaps.push(texture);
            directionalLightMatrices.push(matrix._array);
            directionalLightBiases.push(light.shadowBias);
        },

        _renderSpotLightShadow : function(renderer, light, casts, spotLightBiases, spotLightMatrices, spotLightShadowMaps) {

            this._bindDepthMaterial(casts);

            var texture = this._getTexture(light.__GUID__, light);
            var camera = this._getSpotLightCamera(light);
            var _gl = renderer.gl;

            frameBuffer.attach(_gl, texture);
            frameBuffer.bind(renderer);

            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            renderer.renderQueue(casts, camera, null, true);

            frameBuffer.unbind(renderer);

            // Filter for VSM
            if (this.softShadow === ShadowMapPass.VSM) {
                this._gaussianFilter(renderer, texture, texture.width);
            }

            var matrix = new Matrix4();
            matrix.copy(camera.worldTransform)
                .invert()
                .multiplyLeft(camera.projectionMatrix);

            spotLightShadowMaps.push(texture);
            spotLightMatrices.push(matrix._array);
            spotLightBiases.push(light.shadowBias);
        },

        _renderPointLightShadow : function(renderer, light, casts, pointLightRanges, pointLightShadowMaps) {
            var texture = this._getTexture(light.__GUID__, light);
            var _gl = renderer.gl;
            pointLightShadowMaps.push(texture);
            pointLightRanges.push(light.range * 5);

            this._bindDistanceMaterial(casts, light);
            for (var i = 0; i < 6; i++) {
                var target = targets[i];
                var camera = this._getPointLightCamera(light, target);

                frameBuffer.attach(renderer.gl, texture, _gl.COLOR_ATTACHMENT0, targetMap[target]);
                frameBuffer.bind(renderer);

                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                renderer.renderQueue(casts, camera, null, true);

                frameBuffer.unbind(renderer);
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
                if (this.softShadow === ShadowMapPass.VSM) {
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

        _getPointLightCamera : function(light, target) {
            if (!this._lightCameras.point) {
                this._lightCameras.point = {
                    px : new PerspectiveCamera(),
                    nx : new PerspectiveCamera(),
                    py : new PerspectiveCamera(),
                    ny : new PerspectiveCamera(),
                    pz : new PerspectiveCamera(),
                    nz : new PerspectiveCamera()
                };
            }
            var camera = this._lightCameras.point[target];
            camera.worldTransform.copy(light.worldTransform);

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

            return camera;
        },

        _getDirectionalLightCamera : (function() {
            var lightViewMatrix = new Matrix4();
            var lightViewBBox = new BoundingBox();
            // Camera of directional light will be adjusted
            // to contain the view frustum and scene bounding box as tightly as possible
            return function(light, scene, sceneCamera) {
                if (!this._lightCameras.directional) {
                    this._lightCameras.directional = new OrthoCamera();
                }
                var camera = this._lightCameras.directional;
                // Adjust scene camera
                var originalFar = sceneCamera.far;
                // TODO: add a bias
                sceneCamera.far = Math.max(camera.near, -sceneCamera.sceneBoundingBoxLastFrame.min.z);
                sceneCamera.updateProjectionMatrix();
                sceneCamera.frustum.setFromProjection(sceneCamera.projectionMatrix);
                // set back
                sceneCamera.far = originalFar;

                // Move to the center of frustum(in world space)
                camera.position
                    .copy(sceneCamera.frustum.boundingBox.min)
                    .add(sceneCamera.frustum.boundingBox.max)
                    .scale(0.5)
                    .transformMat4(sceneCamera.worldTransform);
                camera.rotation.copy(light.rotation);
                camera.scale.copy(light.scale);
                camera.updateLocalTransform();
                camera.updateWorldTransform();

                // Transform to light view space
                lightViewMatrix
                    .copy(camera.worldTransform)
                    .invert()
                    .multiply(sceneCamera.worldTransform);
                
                sceneCamera.frustum.getTransformedBoundingBox(lightViewBBox, lightViewMatrix);
                var min = lightViewBBox.min._array;
                var max = lightViewBBox.max._array;

                // Move camera to adjust the near to 0
                camera.position.scaleAndAdd(camera.worldTransform.forward, max[2]);
                camera.near = 0;
                camera.far = -min[2]+max[2];
                camera.left = min[0];
                camera.right = max[0];
                camera.top = max[1];
                camera.bottom = min[1];
                camera.updateLocalTransform();
                camera.updateWorldTransform();
                camera.updateProjectionMatrix();
                camera.frustum.setFromProjection(camera.projectionMatrix);

                return camera;
            }
        })(),

        _getSpotLightCamera : function() {
            if (!this._lightCameras.spot) {
                this._lightCameras.spot = new PerspectiveCamera();
            }
            var camera = this._lightCameras.spot;
            // Update properties
            camera.fov = light.penumbraAngle * 2;
            camera.far = light.range;
            camera.worldTransform.copy(light.worldTransform);
            camera.updateProjectionMatrix();
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
            this._lightCameras = {};
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

    ShadowMapPass.VSM = 1;
    ShadowMapPass.PCF = 2;
    
    return ShadowMapPass;
})