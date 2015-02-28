define(function(require) {

    var Base = require('../core/Base');
    var glenum = require('../core/glenum');
    var Vector3 = require('../math/Vector3');
    var BoundingBox = require('../math/BoundingBox');
    var Frustum = require('../math/Frustum');
    var Matrix4 = require('../math/Matrix4');
    var Renderer = require('../Renderer');
    var Shader = require('../Shader');
    var Light = require('../Light');
    var Mesh = require('../Mesh');
    var SpotLight = require('../light/Spot');
    var DirectionalLight = require('../light/Directional');
    var PointLight = require('../light/Point');
    var shaderLibrary = require('../shader/library');
    var Material = require('../Material');
    var FrameBuffer = require('../FrameBuffer');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');
    var PerspectiveCamera = require('../camera/Perspective');
    var OrthoCamera = require('../camera/Orthographic');

    var Pass = require('../compositor/Pass');
    var TexturePool = require('../compositor/TexturePool');

    var glMatrix = require('../dep/glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

    /**
     * Pass rendering shadow map.
     * 
     * @constructor qtek.prePass.ShadowMap
     * @extends qtek.core.Base
     * @example
     *     var shadowMapPass = new qtek.prePass.ShadowMap({
     *         softShadow: qtek.prePass.ShadowMap.VSM
     *     });
     *     ...
     *     animation.on('frame', function(frameTime) {
     *         shadowMapPass.render(renderer, scene, camera);
     *         renderer.render(scene, camera);
     *     });
     */
    var ShadowMapPass = Base.derive(function() {
        return /** @lends qtek.prePass.ShadowMap# */ {
            /**
             * Soft shadow technique.
             * Can be {@link qtek.prePass.ShadowMap.PCF} or {@link qtek.prePass.ShadowMap.VSM}
             * @type {number}
             */
            softShadow: ShadowMapPass.PCF,
            
            /**
             * Soft shadow blur size
             * @type {number}
             */
            shadowBlur: 1.0,

            /**
             * Shadow cascade.
             * Use PSSM technique when it is larger than 1 and have a unique directional light in scene.
             * @type {number}
             */
            shadowCascade: 1,

            /**
             * Available when shadowCascade is larger than 1 and have a unique directional light in scene.
             * @type {number}
             */
            cascadeSplitLogFactor: 0.2,

            lightFrustumBias: 10,

            _frameBuffer: new FrameBuffer(),

            _textures: {},
            _shadowMapNumber: {
                'POINT_LIGHT': 0,
                'DIRECTIONAL_LIGHT': 0,
                'SPOT_LIGHT': 0
            },

            _meshMaterials: {},
            _depthMaterials: {},
            _depthShaders: {},
            _distanceMaterials: {},

            _opaqueCasters: [],
            _receivers: [],
            _lightsCastShadow: [],

            _lightCameras: {},

            _texturePool: new TexturePool()
        };
    }, function() {
        // Gaussian filter pass for VSM
        this._gaussianPassH = new Pass({
            fragment: Shader.source('buildin.compositor.gaussian_blur_h')
        });
        this._gaussianPassV = new Pass({
            fragment: Shader.source('buildin.compositor.gaussian_blur_v')
        });
        this._gaussianPassH.setUniform('blurSize', this.shadowBlur);
        this._gaussianPassV.setUniform('blurSize', this.shadowBlur);

        this._outputDepthPass = new Pass({
            fragment: Shader.source('buildin.sm.debug_depth')
        });
    }, {
        /**
         * Render scene to shadow textures
         * @param  {qtek.Renderer} renderer
         * @param  {qtek.Scene} scene
         * @param  {qtek.Camera} sceneCamera
         * @memberOf qtek.prePass.ShadowMap.prototype
         */
        render: function(renderer, scene, sceneCamera) {
            this.trigger('beforerender', this, renderer, scene, sceneCamera);
            this._renderShadowPass(renderer, scene, sceneCamera);
            this.trigger('afterrender', this, renderer, scene, sceneCamera);
        },

        /**
         * Debug rendering of shadow textures
         * @param  {qtek.Renderer} renderer
         * @param  {number} size
         * @memberOf qtek.prePass.ShadowMap.prototype
         */
        renderDebug: function(renderer, size) {
            var prevClear = renderer.clear;
            renderer.clear = glenum.DEPTH_BUFFER_BIT;
            var viewport = renderer.viewport;
            var x = 0, y = 0;
            var width = size || viewport.width / 4;
            var height = width;
            if (this.softShadow === ShadowMapPass.VSM) {
                this._outputDepthPass.material.shader.define('fragment', 'USE_VSM');
            } else {
                this._outputDepthPass.material.shader.unDefine('fragment', 'USE_VSM');
            }
            for (var name in this._textures) {
                renderer.setViewport(x, y, width, height);
                this._outputDepthPass.setUniform('depthMap', this._textures[name]);
                this._outputDepthPass.render(renderer);
                x += width;
            }
            renderer.setViewport(viewport);
            renderer.clear = prevClear;
        },

        _bindDepthMaterial: function(casters, bias, slopeScale) {
            for (var i = 0; i < casters.length; i++) {
                var mesh = casters[i];
                var isShadowTransparent = mesh.material.shadowTransparentMap instanceof Texture2D;
                var transparentMap = mesh.material.shadowTransparentMap;
                var nJoints = mesh.joints && mesh.joints.length;
                var matHashKey;
                var shaderHashKey;
                if (isShadowTransparent) {
                    matHashKey = nJoints + '-' + transparentMap.__GUID__;
                    shaderHashKey = nJoints + 's';
                } else {
                    matHashKey = nJoints;
                    shaderHashKey = nJoints;
                }
                var depthMaterial = this._depthMaterials[matHashKey];
                var depthShader = this._depthShaders[shaderHashKey];

                if (mesh.material !== depthMaterial) {  // Not binded yet
                    if (!depthShader) {
                        depthShader = new Shader({
                            vertex: Shader.source('buildin.sm.depth.vertex'),
                            fragment: Shader.source('buildin.sm.depth.fragment')
                        });
                        if (nJoints > 0) {
                            depthShader.define('vertex', 'SKINNING');
                            depthShader.define('vertex', 'JOINT_NUMBER', nJoints);   
                        }
                        if (isShadowTransparent) {
                            depthShader.define('both', 'SHADOW_TRANSPARENT');
                        }
                        this._depthShaders[shaderHashKey] = depthShader;
                    }
                    if (!depthMaterial) {
                        // Skinned mesh
                        depthMaterial = new Material({
                            shader: depthShader
                        });
                        this._depthMaterials[matHashKey] = depthMaterial;
                    }

                    this._meshMaterials[mesh.__GUID__] = mesh.material;
                    mesh.material = depthMaterial;

                    if (this.softShadow === ShadowMapPass.VSM) {
                        depthShader.define('fragment', 'USE_VSM');
                    } else {
                        depthShader.unDefine('fragment', 'USE_VSM');
                    }

                    depthMaterial.setUniform('bias', bias);
                    depthMaterial.setUniform('slopeScale', slopeScale);
                    if (isShadowTransparent) {
                        depthMaterial.set('shadowTransparentMap', transparentMap);
                    }
                }
            }
        },

        _bindDistanceMaterial: function(casters, light) {
            for (var i = 0; i < casters.length; i++) {
                var mesh = casters[i];
                var nJoints = mesh.joints && mesh.joints.length;
                var distanceMaterial = this._distanceMaterials[nJoints];
                if (mesh.material !== distanceMaterial) {
                    if (!distanceMaterial) {
                        // Skinned mesh
                        distanceMaterial = new Material({
                            shader: new Shader({
                                vertex: Shader.source('buildin.sm.distance.vertex'),
                                fragment: Shader.source('buildin.sm.distance.fragment')
                            })
                        });
                        if (nJoints > 0) {
                            distanceMaterial.shader.define('vertex', 'SKINNING');
                            distanceMaterial.shader.define('vertex', 'JOINT_NUMBER', nJoints);   
                        }
                        this._distanceMaterials[nJoints] = distanceMaterial;
                    }

                    this._meshMaterials[mesh.__GUID__] = mesh.material;
                    mesh.material = distanceMaterial;

                    if (this.softShadow === ShadowMapPass.VSM) {
                        distanceMaterial.shader.define('fragment', 'USE_VSM');
                    } else {
                        distanceMaterial.shader.unDefine('fragment', 'USE_VSM');
                    }
                    distanceMaterial.set('lightPosition', light.position._array);
                    distanceMaterial.set('range', light.range * 5);
                }
            }
        },

        _restoreMaterial: function(casters) {
            for (var i = 0; i < casters.length; i++) {
                var mesh = casters[i];
                mesh.material = this._meshMaterials[mesh.__GUID__];
            }
        },

        _updateCaster: function(mesh) {
            if (mesh.castShadow) {
                this._opaqueCasters.push(mesh);
            }
            if (mesh.receiveShadow) {
                this._receivers.push(mesh);
                mesh.material.__shadowUniformUpdated = false;
                mesh.material.shader.__shadowDefineUpdated = false;
                mesh.material.set('shadowEnabled', 1);
            } else {
                mesh.material.set('shadowEnabled', 0);
            }
            if (this.softShadow === ShadowMapPass.VSM) {
                mesh.material.shader.define('fragment', 'USE_VSM');
            } else {
                mesh.material.shader.unDefine('fragment', 'USE_VSM');
            }
        },

        _update: function(scene) {
            for (var i = 0; i < scene.opaqueQueue.length; i++) {
                this._updateCaster(scene.opaqueQueue[i]);
            }
            for (var i = 0; i < scene.transparentQueue.length; i++) {
                // TODO Transparent object receive shadow will be very slow
                // in stealth demo, still not find the reason
                this._updateCaster(scene.transparentQueue[i]);
            }
            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                if (light.castShadow) {
                    this._lightsCastShadow.push(light);
                }
            }
        },

        _renderShadowPass: function(renderer, scene, sceneCamera) {
            // reset
            for (var name in this._shadowMapNumber) {
                this._shadowMapNumber[name] = 0;
            }
            this._lightsCastShadow.length = 0;
            this._opaqueCasters.length = 0;
            this._receivers.length = 0;

            var _gl = renderer.gl;

            scene.update();

            this._update(scene);

            if (!this._lightsCastShadow.length) {
                return;
            }

            _gl.enable(_gl.DEPTH_TEST);
            _gl.depthMask(true);
            _gl.disable(_gl.BLEND);

            // Clear with high-z, so the part not rendered will not been shadowed
            // TODO
            _gl.clearColor(1.0, 1.0, 1.0, 1.0);

            // Shadow uniforms
            var spotLightShadowMaps = [];
            var spotLightMatrices = [];
            var directionalLightShadowMaps = [];
            var directionalLightMatrices = [];
            var shadowCascadeClips = [];
            var pointLightShadowMaps = [];
            var pointLightRanges = [];

            // Create textures for shadow map
            for (var i = 0; i < this._lightsCastShadow.length; i++) {
                var light = this._lightsCastShadow[i];
                if (light instanceof DirectionalLight) {
                    this._renderDirectionalLightShadow(
                        renderer,
                        light,
                        scene,
                        sceneCamera,
                        this._opaqueCasters,
                        shadowCascadeClips,
                        directionalLightMatrices,
                        directionalLightShadowMaps
                    );
                } else if (light instanceof SpotLight) {
                    this._renderSpotLightShadow(
                        renderer,
                        light,
                        this._opaqueCasters, 
                        spotLightMatrices,
                        spotLightShadowMaps
                    );
                } else if (light instanceof PointLight) {
                    this._renderPointLightShadow(
                        renderer,
                        light,
                        this._opaqueCasters,
                        pointLightRanges,
                        pointLightShadowMaps
                    );
                }

                this._shadowMapNumber[light.type]++;
            }
            this._restoreMaterial(this._opaqueCasters);

            if (this.shadowCascade > 1 && this._shadowMapNumber.DIRECTIONAL_LIGHT > 1) {
                console.warn('There is only one directional light can cast shadow when using cascaded shadow map');
            }

            var shadowCascadeClipsNear = shadowCascadeClips.slice();
            var shadowCascadeClipsFar = shadowCascadeClips.slice();
            shadowCascadeClipsNear.pop();
            shadowCascadeClipsFar.shift();

            // Iterate from far to near
            shadowCascadeClipsNear.reverse();
            shadowCascadeClipsFar.reverse();
            directionalLightShadowMaps.reverse();
            directionalLightMatrices.reverse();

            for (var i = 0; i < this._receivers.length; i++) {
                var mesh = this._receivers[i];
                var material = mesh.material;
                if (material.__shadowUniformUpdated) {
                    continue;
                }
                var shader = material.shader;

                if (!shader.__shadowDefineUpdated) {
                    var shaderNeedsUpdate = false;
                    for (var lightType in this._shadowMapNumber) {
                        var number = this._shadowMapNumber[lightType];
                        var key = lightType + '_SHADOWMAP_NUMBER';

                        if (shader.fragmentDefines[key] !== number && number > 0) {
                            shader.fragmentDefines[key] = number;
                            shaderNeedsUpdate = true;
                        }
                    }
                    if (shaderNeedsUpdate) {
                        shader.dirty();
                    }
                    if (this.shadowCascade > 1) {
                        shader.define('fragment', 'SHADOW_CASCADE', this.shadowCascade);
                    } else {
                        shader.unDefine('fragment', 'SHADOW_CASCADE');
                    }
                    shader.__shadowDefineUpdated = true;
                }

                if (spotLightShadowMaps.length > 0) {
                    material.setUniform('spotLightShadowMaps', spotLightShadowMaps);
                    material.setUniform('spotLightMatrices', spotLightMatrices);   
                }
                if (directionalLightShadowMaps.length > 0) {
                    material.setUniform('directionalLightShadowMaps', directionalLightShadowMaps);
                    if (this.shadowCascade > 1) {
                        material.setUniform('shadowCascadeClipsNear', shadowCascadeClipsNear);
                        material.setUniform('shadowCascadeClipsFar', shadowCascadeClipsFar);
                    }
                    material.setUniform('directionalLightMatrices', directionalLightMatrices);   
                }
                if (pointLightShadowMaps.length > 0) {
                    material.setUniform('pointLightShadowMaps', pointLightShadowMaps);
                    material.setUniform('pointLightRanges', pointLightRanges);   
                }
                material.__shadowUniformUpdated = true;
            }
        },

        _renderDirectionalLightShadow: (function() {

            var splitFrustum = new Frustum();
            var splitProjMatrix = new Matrix4();
            var cropBBox = new BoundingBox();
            var cropMatrix = new Matrix4();
            var lightViewProjMatrix = new Matrix4();
            var lightProjMatrix = new Matrix4();

            var prevDepth = 0;
            var deltaDepth = 0;
            return function(renderer, light, scene, sceneCamera, casters, shadowCascadeClips, directionalLightMatrices, directionalLightShadowMaps) {

                var shadowBias = light.shadowBias;
                this._bindDepthMaterial(casters, shadowBias, light.shadowSlopeScale);

                casters.sort(Renderer.opaqueSortFunc);

                // Adjust scene camera
                var originalFar = sceneCamera.far;

                // Considering moving speed since the bounding box is from last frame
                // verlet integration ?
                var depth = -sceneCamera.sceneBoundingBoxLastFrame.min.z;
                deltaDepth = Math.max(depth - prevDepth, 0);
                prevDepth = depth;
                depth += deltaDepth;
                // TODO: add a bias
                if (depth > sceneCamera.near) {
                    sceneCamera.far = Math.min(sceneCamera.far, depth);   
                }
                sceneCamera.updateProjectionMatrix();
                sceneCamera.frustum.setFromProjection(sceneCamera.projectionMatrix);
                var lightCamera = this._getDirectionalLightCamera(light, scene, sceneCamera);

                var lvpMat4Arr = lightViewProjMatrix._array;
                mat4.copy(lvpMat4Arr, lightCamera.worldTransform._array);
                mat4.invert(lvpMat4Arr, lvpMat4Arr);
                mat4.multiply(lvpMat4Arr, lightCamera.projectionMatrix._array, lvpMat4Arr);
                mat4.multiply(lvpMat4Arr, lvpMat4Arr, sceneCamera.worldTransform._array);

                lightProjMatrix.copy(lightCamera.projectionMatrix);

                var clipPlanes = [];
                var near = sceneCamera.near;
                var far = sceneCamera.far;
                var rad = sceneCamera.fov / 180 * Math.PI;
                var aspect = sceneCamera.aspect;

                var scaleZ = (near + originalFar) / (near - originalFar);
                var offsetZ = 2 * near * originalFar / (near - originalFar);
                for (var i = 0; i <= this.shadowCascade; i++) {
                    var clog = near * Math.pow(far / near, i / this.shadowCascade);
                    var cuni = near + (far - near) * i / this.shadowCascade;
                    var c = clog * this.cascadeSplitLogFactor + cuni * (1 - this.cascadeSplitLogFactor);
                    clipPlanes.push(c);
                    shadowCascadeClips.push(-(-c * scaleZ + offsetZ) / -c);
                }
                for (var i = 0; i < this.shadowCascade; i++) {
                    var texture = this._getTexture(light.__GUID__ + '_' + i, light);

                    // Get the splitted frustum
                    var nearPlane = clipPlanes[i];
                    var farPlane = clipPlanes[i+1];
                    mat4.perspective(splitProjMatrix._array, rad, aspect, nearPlane, farPlane);
                    splitFrustum.setFromProjection(splitProjMatrix);
                    splitFrustum.getTransformedBoundingBox(cropBBox, lightViewProjMatrix);
                    var _min = cropBBox.min._array;
                    var _max = cropBBox.max._array;
                    cropMatrix.ortho(_min[0], _max[0], _min[1], _max[1], 1, -1);
                    lightCamera.projectionMatrix.multiplyLeft(cropMatrix);

                    var _gl = renderer.gl;

                    this._frameBuffer.attach(_gl, texture);
                    this._frameBuffer.bind(renderer);

                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                    // Set bias seperately for each cascade
                    // TODO Simply divide 1.5 ?
                    for (var key in this._depthMaterials) {
                        this._depthMaterials[key].set('shadowBias', shadowBias);
                    }

                    renderer.renderQueue(casters, lightCamera);

                    this._frameBuffer.unbind(renderer);

                    // Filter for VSM
                    if (this.softShadow === ShadowMapPass.VSM) {
                        this._gaussianFilter(renderer, texture, texture.width);
                    }

                    var matrix = new Matrix4();
                    matrix.copy(lightCamera.worldTransform)
                        .invert()
                        .multiplyLeft(lightCamera.projectionMatrix);

                    directionalLightShadowMaps.push(texture);
                    directionalLightMatrices.push(matrix._array);

                    lightCamera.projectionMatrix.copy(lightProjMatrix);
                }

                // set back
                sceneCamera.far = originalFar;
            };
        })(),

        _renderSpotLightShadow: function(renderer, light, casters, spotLightMatrices, spotLightShadowMaps) {

            this._bindDepthMaterial(casters, light.shadowBias, light.shadowSlopeScale);
            casters.sort(Renderer.opaqueSortFunc);

            var texture = this._getTexture(light.__GUID__, light);
            var camera = this._getSpotLightCamera(light);
            var _gl = renderer.gl;

            this._frameBuffer.attach(_gl, texture);
            this._frameBuffer.bind(renderer);

            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            renderer.renderQueue(casters, camera);

            this._frameBuffer.unbind(renderer);

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
        },

        _renderPointLightShadow: function(renderer, light, casters, pointLightRanges, pointLightShadowMaps) {
            var texture = this._getTexture(light.__GUID__, light);
            var _gl = renderer.gl;
            pointLightShadowMaps.push(texture);
            pointLightRanges.push(light.range * 5);

            this._bindDistanceMaterial(casters, light);
            for (var i = 0; i < 6; i++) {
                var target = targets[i];
                var camera = this._getPointLightCamera(light, target);

                this._frameBuffer.attach(renderer.gl, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
                this._frameBuffer.bind(renderer);

                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                renderer.renderQueue(casters, camera);

                this._frameBuffer.unbind(renderer);
            }
        },

        _gaussianFilter: function(renderer, texture, size) {
            var parameter = {
                width: size,
                height: size,
                type: glenum.FLOAT
            };
            var _gl = renderer.gl;
            var tmpTexture = this._texturePool.get(parameter);
            
            this._frameBuffer.attach(_gl, tmpTexture);
            this._frameBuffer.bind(renderer);
            this._gaussianPassH.setUniform('texture', texture);
            this._gaussianPassH.setUniform('textureWidth', size);
            this._gaussianPassH.render(renderer);
            this._frameBuffer.unbind(renderer);

            this._frameBuffer.attach(_gl, texture);
            this._frameBuffer.bind(renderer);
            this._gaussianPassV.setUniform('texture', tmpTexture);
            this._gaussianPassV.setUniform('textureHeight', size);
            this._gaussianPassV.render(renderer);
            this._frameBuffer.unbind(renderer);

            this._texturePool.put(tmpTexture);
        },

        _getTexture: function(key, light) {
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
                    texture.type = glenum.FLOAT;
                    texture.anisotropic = 4;
                } else {
                    texture.minFilter = glenum.LINEAR;
                    texture.magFilter = glenum.LINEAR;
                    texture.useMipmap = false;
                }
                this._textures[key] = texture;
            }

            return texture;
        },

        _getPointLightCamera: function(light, target) {
            if (!this._lightCameras.point) {
                this._lightCameras.point = {
                    px: new PerspectiveCamera(),
                    nx: new PerspectiveCamera(),
                    py: new PerspectiveCamera(),
                    ny: new PerspectiveCamera(),
                    pz: new PerspectiveCamera(),
                    nz: new PerspectiveCamera()
                };
            }
            var camera = this._lightCameras.point[target];

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

        _getDirectionalLightCamera: (function() {
            var lightViewMatrix = new Matrix4();
            var lightViewBBox = new BoundingBox();
            // Camera of directional light will be adjusted
            // to contain the view frustum and scene bounding box as tightly as possible
            return function(light, scene, sceneCamera) {
                if (!this._lightCameras.directional) {
                    this._lightCameras.directional = new OrthoCamera();
                }
                var camera = this._lightCameras.directional;

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
                // TODO: some scene object cast shadow in view will also be culled
                // add a bias?
                camera.position.scaleAndAdd(camera.worldTransform.z, max[2] + this.lightFrustumBias);
                camera.near = 0;
                camera.far = -min[2] + max[2] + this.lightFrustumBias;
                camera.left = min[0] - this.lightFrustumBias;
                camera.right = max[0] + this.lightFrustumBias;
                camera.top = max[1] + this.lightFrustumBias;
                camera.bottom = min[1] - this.lightFrustumBias;
                camera.update(true);

                return camera;
            };
        })(),

        _getSpotLightCamera: function(light) {
            if (!this._lightCameras.spot) {
                this._lightCameras.spot = new PerspectiveCamera();
            }
            var camera = this._lightCameras.spot;
            // Update properties
            camera.fov = light.penumbraAngle * 2;
            camera.far = light.range;
            camera.worldTransform.copy(light.worldTransform);
            camera.updateProjectionMatrix();
            mat4.invert(camera.viewMatrix._array, camera.worldTransform._array);

            return camera;
        },

        /**
         * @param  {qtek.Renderer} renderer
         * @memberOf qtek.prePass.ShadowMap.prototype
         */
        dispose: function(renderer) {
            var _gl = renderer.gl;
            for (var guid in this._depthMaterials) {
                var mat = this._depthMaterials[guid];
                mat.dispose(_gl);
            }
            for (var guid in this._distanceMaterials) {
                var mat = this._distanceMaterials[guid];
                mat.dispose(_gl);
            }

            if (this._frameBuffer) {
                this._frameBuffer.dispose(_gl);
            }

            for (var name in this._textures) {
                this._textures[name].dispose(_gl);
            }

            this._texturePool.clear(renderer.gl);

            this._depthMaterials = {};
            this._distanceMaterials = {};
            this._textures = {};
            this._lightCameras = {};
            this._shadowMapNumber = {
                'POINT_LIGHT': 0,
                'DIRECTIONAL_LIGHT': 0,
                'SPOT_LIGHT': 0
            };
            this._meshMaterials = {};

            for (var i = 0; i < this._receivers.length; i++) {
                var mesh = this._receivers[i];
                // Mesh may be disposed
                if (mesh.material && mesh.material.shader) {
                    var material = mesh.material;
                    var shader = material.shader;
                    shader.unDefine('fragment', 'POINT_LIGHT_SHADOW_NUMBER');
                    shader.unDefine('fragment', 'DIRECTIONAL_LIGHT_SHADOW_NUMBER');
                    shader.unDefine('fragment', 'AMBIENT_LIGHT_SHADOW_NUMBER');
                    material.set('shadowEnabled', 0);   
                }
            }

            this._opaqueCasters = [];
            this._receivers = [];
            this._lightsCastShadow = [];
        }
    });
    
    /**
     * @name qtek.prePass.ShadowMap.VSM
     * @type {number}
     */
    ShadowMapPass.VSM = 1;
    
    /**
     * @name qtek.prePass.ShadowMap.PCF
     * @type {number}
     */
    ShadowMapPass.PCF = 2;
    
    return ShadowMapPass;
});