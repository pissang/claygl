import Base from '../core/Base';
import glenum from '../core/glenum';
import Vector3 from '../math/Vector3';
import BoundingBox from '../math/BoundingBox';
import Frustum from '../math/Frustum';
import Matrix4 from '../math/Matrix4';
import Renderer from '../Renderer';
import Shader from '../Shader';
import Light from '../Light';
import Mesh from '../Mesh';
import SpotLight from '../light/Spot';
import DirectionalLight from '../light/Directional';
import PointLight from '../light/Point';
import shaderLibrary from '../shader/library';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import Texture from '../Texture';
import Texture2D from '../Texture2D';
import TextureCube from '../TextureCube';
import PerspectiveCamera from '../camera/Perspective';
import OrthoCamera from '../camera/Orthographic';

import Pass from '../compositor/Pass';
import TexturePool from '../compositor/TexturePool';

import glMatrix from '../dep/glmatrix';
var mat4 = glMatrix.mat4;
var vec3 = glMatrix.vec3;

var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

import shadowmapEssl from '../shader/source/shadowmap.glsl.js';
Shader['import'](shadowmapEssl);

/**
 * Pass rendering shadow map.
 *
 * @constructor clay.prePass.ShadowMap
 * @extends clay.core.Base
 * @example
 *     var shadowMapPass = new clay.prePass.ShadowMap({
 *         softShadow: clay.prePass.ShadowMap.VSM
 *     });
 *     ...
 *     animation.on('frame', function (frameTime) {
 *         shadowMapPass.render(renderer, scene, camera);
 *         renderer.render(scene, camera);
 *     });
 */
var ShadowMapPass = Base.extend(function () {
    return /** @lends clay.prePass.ShadowMap# */ {
        /**
         * Soft shadow technique.
         * Can be {@link clay.prePass.ShadowMap.PCF} or {@link clay.prePass.ShadowMap.VSM}
         * @type {number}
         */
        softShadow: ShadowMapPass.PCF,

        /**
         * Soft shadow blur size
         * @type {number}
         */
        shadowBlur: 1.0,

        lightFrustumBias: 'auto',

        kernelPCF: new Float32Array([
            1, 0,
            1, 1,
            -1, 1,
            0, 1,
            -1, 0,
            -1, -1,
            1, -1,
            0, -1
        ]),

        precision: 'mediump',

        _lastRenderNotCastShadow: false,

        _frameBuffer: new FrameBuffer(),

        _textures: {},
        _shadowMapNumber: {
            'POINT_LIGHT': 0,
            'DIRECTIONAL_LIGHT': 0,
            'SPOT_LIGHT': 0
        },

        _depthMaterials: {},
        _distanceMaterials: {},

        _opaqueCasters: [],
        _receivers: [],
        _lightsCastShadow: [],

        _lightCameras: {},
        _lightMaterials: {},

        _texturePool: new TexturePool()
    };
}, function () {
    // Gaussian filter pass for VSM
    this._gaussianPassH = new Pass({
        fragment: Shader.source('clay.compositor.gaussian_blur')
    });
    this._gaussianPassV = new Pass({
        fragment: Shader.source('clay.compositor.gaussian_blur')
    });
    this._gaussianPassH.setUniform('blurSize', this.shadowBlur);
    this._gaussianPassH.setUniform('blurDir', 0.0);
    this._gaussianPassV.setUniform('blurSize', this.shadowBlur);
    this._gaussianPassV.setUniform('blurDir', 1.0);

    this._outputDepthPass = new Pass({
        fragment: Shader.source('clay.sm.debug_depth')
    });
}, {
    /**
     * Render scene to shadow textures
     * @param  {clay.Renderer} renderer
     * @param  {clay.Scene} scene
     * @param  {clay.Camera} sceneCamera
     * @param  {boolean} [notUpdateScene=false]
     * @memberOf clay.prePass.ShadowMap.prototype
     */
    render: function (renderer, scene, sceneCamera, notUpdateScene) {
        if (!sceneCamera) {
            sceneCamera = scene.getMainCamera();
        }
        this.trigger('beforerender', this, renderer, scene, sceneCamera);
        this._renderShadowPass(renderer, scene, sceneCamera, notUpdateScene);
        this.trigger('afterrender', this, renderer, scene, sceneCamera);
    },

    /**
     * Debug rendering of shadow textures
     * @param  {clay.Renderer} renderer
     * @param  {number} size
     * @memberOf clay.prePass.ShadowMap.prototype
     */
    renderDebug: function (renderer, size) {
        renderer.saveClear();
        var viewport = renderer.viewport;
        var x = 0, y = 0;
        var width = size || viewport.width / 4;
        var height = width;
        if (this.softShadow === ShadowMapPass.VSM) {
            this._outputDepthPass.material.define('fragment', 'USE_VSM');
        }
        else {
            this._outputDepthPass.material.undefine('fragment', 'USE_VSM');
        }
        for (var name in this._textures) {
            var texture = this._textures[name];
            renderer.setViewport(x, y, width * texture.width / texture.height, height);
            this._outputDepthPass.setUniform('depthMap', texture);
            this._outputDepthPass.render(renderer);
            x += width * texture.width / texture.height;
        }
        renderer.setViewport(viewport);
        renderer.restoreClear();
    },

    _updateCasterAndReceiver: function (renderer, mesh) {
        if (mesh.castShadow) {
            this._opaqueCasters.push(mesh);
        }
        if (mesh.receiveShadow) {
            this._receivers.push(mesh);
            mesh.material.set('shadowEnabled', 1);

            mesh.material.set('pcfKernel', this.kernelPCF);
        }
        else {
            mesh.material.set('shadowEnabled', 0);
        }

        if (!mesh.material.shader && mesh.material.updateShader) {
            mesh.material.updateShader(renderer);
        }
        if (this.softShadow === ShadowMapPass.VSM) {
            mesh.material.define('fragment', 'USE_VSM');
            mesh.material.undefine('fragment', 'PCF_KERNEL_SIZE');
        }
        else {
            mesh.material.undefine('fragment', 'USE_VSM');
            var kernelPCF = this.kernelPCF;
            if (kernelPCF && kernelPCF.length) {
                mesh.material.define('fragment', 'PCF_KERNEL_SIZE', kernelPCF.length / 2);
            }
            else {
                mesh.material.undefine('fragment', 'PCF_KERNEL_SIZE');
            }
        }
    },

    _update: function (renderer, scene) {
        for (var i = 0; i < scene.opaqueList.length; i++) {
            this._updateCasterAndReceiver(renderer, scene.opaqueList[i]);
        }
        for (var i = 0; i < scene.transparentList.length; i++) {
            // TODO Transparent object receive shadow will be very slow
            // in stealth demo, still not find the reason
            this._updateCasterAndReceiver(renderer, scene.transparentList[i]);
        }
        for (var i = 0; i < scene.lights.length; i++) {
            var light = scene.lights[i];
            if (light.castShadow) {
                this._lightsCastShadow.push(light);
            }
        }
    },

    _renderShadowPass: function (renderer, scene, sceneCamera, notUpdateScene) {
        // reset
        for (var name in this._shadowMapNumber) {
            this._shadowMapNumber[name] = 0;
        }
        this._lightsCastShadow.length = 0;
        this._opaqueCasters.length = 0;
        this._receivers.length = 0;

        var _gl = renderer.gl;

        if (!notUpdateScene) {
            scene.update();
        }
        if (sceneCamera) {
            sceneCamera.update();
        }

        this._update(renderer, scene);

        // Needs to update the receivers again if shadows come from 1 to 0.
        if (!this._lightsCastShadow.length && this._lastRenderNotCastShadow) {
            return;
        }

        this._lastRenderNotCastShadow = this._lightsCastShadow === 0;

        _gl.enable(_gl.DEPTH_TEST);
        _gl.depthMask(true);
        _gl.disable(_gl.BLEND);

        // Clear with high-z, so the part not rendered will not been shadowed
        // TODO
        // TODO restore
        _gl.clearColor(1.0, 1.0, 1.0, 1.0);

        // Shadow uniforms
        var spotLightShadowMaps = [];
        var spotLightMatrices = [];
        var directionalLightShadowMaps = [];
        var directionalLightMatrices = [];
        var shadowCascadeClips = [];
        var pointLightShadowMaps = [];

        var dirLightHasCascade;
        // Create textures for shadow map
        for (var i = 0; i < this._lightsCastShadow.length; i++) {
            var light = this._lightsCastShadow[i];
            if (light instanceof DirectionalLight) {

                if (dirLightHasCascade) {
                    console.warn('Only one direectional light supported with shadow cascade');
                    continue;
                }
                if (light.shadowCascade > 4) {
                    console.warn('Support at most 4 cascade');
                    continue;
                }
                if (light.shadowCascade > 1) {
                    dirLightHasCascade = light.shadowCascade;
                }

                this.renderDirectionalLightShadow(
                    renderer,
                    scene,
                    sceneCamera,
                    light,
                    this._opaqueCasters,
                    shadowCascadeClips,
                    directionalLightMatrices,
                    directionalLightShadowMaps
                );
            }
            else if (light instanceof SpotLight) {
                this.renderSpotLightShadow(
                    renderer,
                    scene,
                    light,
                    this._opaqueCasters,
                    spotLightMatrices,
                    spotLightShadowMaps
                );
            }
            else if (light instanceof PointLight) {
                this.renderPointLightShadow(
                    renderer,
                    scene,
                    light,
                    this._opaqueCasters,
                    pointLightShadowMaps
                );
            }

            this._shadowMapNumber[light.type]++;
        }

        for (var lightType in this._shadowMapNumber) {
            var number = this._shadowMapNumber[lightType];
            var key = lightType + '_SHADOWMAP_COUNT';
            for (var i = 0; i < this._receivers.length; i++) {
                var mesh = this._receivers[i];
                var material = mesh.material;
                if (material.fragmentDefines[key] !== number) {
                    if (number > 0) {
                        material.define('fragment', key, number);
                    }
                    else if (material.isDefined('fragment', key)) {
                        material.undefine('fragment', key);
                    }
                }
            }
        }
        for (var i = 0; i < this._receivers.length; i++) {
            var mesh = this._receivers[i];
            var material = mesh.material;
            if (dirLightHasCascade) {
                material.define('fragment', 'SHADOW_CASCADE', dirLightHasCascade.shadowCascade);
            }
            else {
                material.undefine('fragment', 'SHADOW_CASCADE');
            }
        }

        var shadowUniforms = scene.shadowUniforms;

        function getSize(texture) {
            return texture.height;
        }
        if (directionalLightShadowMaps.length > 0) {
            var directionalLightShadowMapSizes = directionalLightShadowMaps.map(getSize);
            shadowUniforms.directionalLightShadowMaps = { value: directionalLightShadowMaps, type: 'tv' };
            shadowUniforms.directionalLightMatrices = { value: directionalLightMatrices, type: 'm4v' };
            shadowUniforms.directionalLightShadowMapSizes = { value: directionalLightShadowMapSizes, type: '1fv' };
            if (dirLightHasCascade) {
                var shadowCascadeClipsNear = shadowCascadeClips.slice();
                var shadowCascadeClipsFar = shadowCascadeClips.slice();
                shadowCascadeClipsNear.pop();
                shadowCascadeClipsFar.shift();

                // Iterate from far to near
                shadowCascadeClipsNear.reverse();
                shadowCascadeClipsFar.reverse();
                // directionalLightShadowMaps.reverse();
                directionalLightMatrices.reverse();
                shadowUniforms.shadowCascadeClipsNear = { value: shadowCascadeClipsNear, type: '1fv' };
                shadowUniforms.shadowCascadeClipsFar = { value: shadowCascadeClipsFar, type: '1fv' };
            }
        }

        if (spotLightShadowMaps.length > 0) {
            var spotLightShadowMapSizes = spotLightShadowMaps.map(getSize);
            var shadowUniforms = scene.shadowUniforms;
            shadowUniforms.spotLightShadowMaps = { value: spotLightShadowMaps, type: 'tv' };
            shadowUniforms.spotLightMatrices = { value: spotLightMatrices, type: 'm4v' };
            shadowUniforms.spotLightShadowMapSizes = { value: spotLightShadowMapSizes, type: '1fv' };
        }

        if (pointLightShadowMaps.length > 0) {
            shadowUniforms.pointLightShadowMaps = { value: pointLightShadowMaps, type: 'tv' };
        }
    },

    renderDirectionalLightShadow: (function () {

        var splitFrustum = new Frustum();
        var splitProjMatrix = new Matrix4();
        var cropBBox = new BoundingBox();
        var cropMatrix = new Matrix4();
        var lightViewMatrix = new Matrix4();
        var lightViewProjMatrix = new Matrix4();
        var lightProjMatrix = new Matrix4();

        return function (renderer, scene, sceneCamera, light, casters, shadowCascadeClips, directionalLightMatrices, directionalLightShadowMaps) {

            var defaultShadowMaterial = this._getDepthMaterial(light);
            var passConfig = {
                getMaterial: function (renderable) {
                    return renderable.shadowDepthMaterial || defaultShadowMaterial;
                },
                sortCompare: Renderer.opaqueSortCompare
            };

            // First frame
            if (!scene.viewBoundingBoxLastFrame.isFinite()) {
                var boundingBox = scene.getBoundingBox();
                scene.viewBoundingBoxLastFrame
                    .copy(boundingBox).applyTransform(sceneCamera.viewMatrix);
            }
            // Considering moving speed since the bounding box is from last frame
            // TODO: add a bias
            var clippedFar = Math.min(-scene.viewBoundingBoxLastFrame.min.z, sceneCamera.far);
            var clippedNear = Math.max(-scene.viewBoundingBoxLastFrame.max.z, sceneCamera.near);

            var lightCamera = this._getDirectionalLightCamera(light, scene, sceneCamera);

            var lvpMat4Arr = lightViewProjMatrix.array;
            lightProjMatrix.copy(lightCamera.projectionMatrix);
            mat4.invert(lightViewMatrix.array, lightCamera.worldTransform.array);
            mat4.multiply(lightViewMatrix.array, lightViewMatrix.array, sceneCamera.worldTransform.array);
            mat4.multiply(lvpMat4Arr, lightProjMatrix.array, lightViewMatrix.array);

            var clipPlanes = [];
            var isPerspective = sceneCamera instanceof PerspectiveCamera;

            var scaleZ = (sceneCamera.near + sceneCamera.far) / (sceneCamera.near - sceneCamera.far);
            var offsetZ = 2 * sceneCamera.near * sceneCamera.far / (sceneCamera.near - sceneCamera.far);
            for (var i = 0; i <= light.shadowCascade; i++) {
                var clog = clippedNear * Math.pow(clippedFar / clippedNear, i / light.shadowCascade);
                var cuni = clippedNear + (clippedFar - clippedNear) * i / light.shadowCascade;
                var c = clog * light.cascadeSplitLogFactor + cuni * (1 - light.cascadeSplitLogFactor);
                clipPlanes.push(c);
                shadowCascadeClips.push(-(-c * scaleZ + offsetZ) / -c);
            }
            var texture = this._getTexture(light, light.shadowCascade);
            directionalLightShadowMaps.push(texture);

            var viewport = renderer.viewport;

            var _gl = renderer.gl;
            this._frameBuffer.attach(texture);
            this._frameBuffer.bind(renderer);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            for (var i = 0; i < light.shadowCascade; i++) {
                // Get the splitted frustum
                var nearPlane = clipPlanes[i];
                var farPlane = clipPlanes[i + 1];
                if (isPerspective) {
                    mat4.perspective(splitProjMatrix.array, sceneCamera.fov / 180 * Math.PI, sceneCamera.aspect, nearPlane, farPlane);
                }
                else {
                    mat4.ortho(
                        splitProjMatrix.array,
                        sceneCamera.left, sceneCamera.right, sceneCamera.bottom, sceneCamera.top,
                        nearPlane, farPlane
                    );
                }
                splitFrustum.setFromProjection(splitProjMatrix);
                splitFrustum.getTransformedBoundingBox(cropBBox, lightViewMatrix);
                cropBBox.applyProjection(lightProjMatrix);
                var _min = cropBBox.min.array;
                var _max = cropBBox.max.array;
                _min[0] = Math.max(_min[0], -1);
                _min[1] = Math.max(_min[1], -1);
                _max[0] = Math.min(_max[0], 1);
                _max[1] = Math.min(_max[1], 1);
                cropMatrix.ortho(_min[0], _max[0], _min[1], _max[1], 1, -1);
                lightCamera.projectionMatrix.multiplyLeft(cropMatrix);

                var shadowSize = light.shadowResolution || 512;

                // Reversed, left to right => far to near
                renderer.setViewport((light.shadowCascade - i - 1) * shadowSize, 0, shadowSize, shadowSize, 1);

                renderer.renderPass(casters, lightCamera, passConfig);

                // Filter for VSM
                if (this.softShadow === ShadowMapPass.VSM) {
                    this._gaussianFilter(renderer, texture, texture.width);
                }

                var matrix = new Matrix4();
                matrix.copy(lightCamera.viewMatrix)
                    .multiplyLeft(lightCamera.projectionMatrix);

                directionalLightMatrices.push(matrix.array);

                lightCamera.projectionMatrix.copy(lightProjMatrix);
            }

            this._frameBuffer.unbind(renderer);

            renderer.setViewport(viewport);
        };
    })(),

    renderSpotLightShadow: function (renderer, scene, light, casters, spotLightMatrices, spotLightShadowMaps) {

        var texture = this._getTexture(light);
        var lightCamera = this._getSpotLightCamera(light);
        var _gl = renderer.gl;

        this._frameBuffer.attach(texture);
        this._frameBuffer.bind(renderer);

        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

        var defaultShadowMaterial = this._getDepthMaterial(light);
        var passConfig = {
            getMaterial: function (renderable) {
                return renderable.shadowDepthMaterial || defaultShadowMaterial;
            },
            sortCompare: Renderer.opaqueSortCompare
        };

        renderer.renderPass(renderer.cullRenderList(casters, null, lightCamera), lightCamera, passConfig);

        this._frameBuffer.unbind(renderer);

        // Filter for VSM
        if (this.softShadow === ShadowMapPass.VSM) {
            this._gaussianFilter(renderer, texture, texture.width);
        }

        var matrix = new Matrix4();
        matrix.copy(lightCamera.worldTransform)
            .invert()
            .multiplyLeft(lightCamera.projectionMatrix);

        spotLightShadowMaps.push(texture);
        spotLightMatrices.push(matrix.array);
    },

    renderPointLightShadow: function (renderer, scene, light, casters, pointLightShadowMaps) {
        var texture = this._getTexture(light);
        var _gl = renderer.gl;
        pointLightShadowMaps.push(texture);

        var defaultShadowMaterial = this._getDepthMaterial(light);
        var passConfig = {
            getMaterial: function (renderable) {
                return renderable.shadowDepthMaterial || defaultShadowMaterial;
            },
            sortCompare: Renderer.opaqueSortCompare
        };

        for (var i = 0; i < 6; i++) {
            var target = targets[i];
            var camera = this._getPointLightCamera(light, target);

            this._frameBuffer.attach(texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
            this._frameBuffer.bind(renderer);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            renderer.renderPass(renderer.cullRenderList(casters, null, camera), camera, passConfig);
        }

        this._frameBuffer.unbind(renderer);
    },

    _getDepthMaterial: function (light) {
        var shadowMaterial = this._lightMaterials[light.__uid__];
        var isPointLight = light instanceof PointLight;
        if (!shadowMaterial) {
            var shaderPrefix = isPointLight ? 'clay.sm.distance.' : 'clay.sm.depth.';
            shadowMaterial = new Material({
                precision: this.precision,
                shader: new Shader(Shader.source(shaderPrefix + 'vertex'), Shader.source(shaderPrefix + 'fragment'))
            });

            this._lightMaterials[light.__uid__] = shadowMaterial;
        }
        if (light.shadowSlopeScale != null) {
            shadowMaterial.setUniform('slopeScale', light.shadowSlopeScale);
        }
        if (light.shadowBias != null) {
            shadowMaterial.setUniform('shadowBias', light.shadowBias);
        }
        if (this.softShadow === ShadowMapPass.VSM) {
            shadowMaterial.define('fragment', 'USE_VSM');
        }
        else {
            shadowMaterial.undefine('fragment', 'USE_VSM');
        }

        if (isPointLight) {
            shadowMaterial.set('lightPosition', light.getWorldPosition().array);
            shadowMaterial.set('range', light.range);
        }

        return shadowMaterial;
    },

    _gaussianFilter: function (renderer, texture, size) {
        var parameter = {
            width: size,
            height: size,
            type: Texture.FLOAT
        };
        var tmpTexture = this._texturePool.get(parameter);

        this._frameBuffer.attach(tmpTexture);
        this._frameBuffer.bind(renderer);
        this._gaussianPassH.setUniform('texture', texture);
        this._gaussianPassH.setUniform('textureWidth', size);
        this._gaussianPassH.render(renderer);

        this._frameBuffer.attach(texture);
        this._gaussianPassV.setUniform('texture', tmpTexture);
        this._gaussianPassV.setUniform('textureHeight', size);
        this._gaussianPassV.render(renderer);
        this._frameBuffer.unbind(renderer);

        this._texturePool.put(tmpTexture);
    },

    _getTexture: function (light, cascade) {
        var key = light.__uid__;
        var texture = this._textures[key];
        var resolution = light.shadowResolution || 512;
        cascade = cascade || 1;
        if (!texture) {
            if (light instanceof PointLight) {
                texture = new TextureCube();
            }
            else {
                texture = new Texture2D();
            }
            // At most 4 cascade
            // TODO share with height ?
            texture.width = resolution * cascade;
            texture.height = resolution;
            if (this.softShadow === ShadowMapPass.VSM) {
                texture.type = Texture.FLOAT;
                texture.anisotropic = 4;
            }
            else {
                texture.minFilter = glenum.NEAREST;
                texture.magFilter = glenum.NEAREST;
                texture.useMipmap = false;
            }
            this._textures[key] = texture;
        }

        return texture;
    },

    _getPointLightCamera: function (light, target) {
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
        light.getWorldPosition(camera.position);
        camera.update();

        return camera;
    },

    _getDirectionalLightCamera: (function () {
        var lightViewMatrix = new Matrix4();
        var sceneViewBoundingBox = new BoundingBox();
        var lightViewBBox = new BoundingBox();
        // Camera of directional light will be adjusted
        // to contain the view frustum and scene bounding box as tightly as possible
        return function (light, scene, sceneCamera) {
            if (!this._lightCameras.directional) {
                this._lightCameras.directional = new OrthoCamera();
            }
            var camera = this._lightCameras.directional;

            sceneViewBoundingBox.copy(scene.viewBoundingBoxLastFrame);
            sceneViewBoundingBox.intersection(sceneCamera.frustum.boundingBox);
            // Move to the center of frustum(in world space)
            camera.position
                .copy(sceneViewBoundingBox.min)
                .add(sceneViewBoundingBox.max)
                .scale(0.5)
                .transformMat4(sceneCamera.worldTransform);
            camera.rotation.copy(light.rotation);
            camera.scale.copy(light.scale);
            camera.updateWorldTransform();

            // Transform to light view space
            Matrix4.invert(lightViewMatrix, camera.worldTransform);
            Matrix4.multiply(lightViewMatrix, lightViewMatrix, sceneCamera.worldTransform);

            lightViewBBox.copy(sceneViewBoundingBox).applyTransform(lightViewMatrix);

            var min = lightViewBBox.min.array;
            var max = lightViewBBox.max.array;

            // Move camera to adjust the near to 0
            camera.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, max[2])
                .transformMat4(camera.worldTransform);
            camera.near = 0;
            camera.far = -min[2] + max[2];
            // Make sure receivers not in the frustum will stil receive the shadow.
            if (isNaN(this.lightFrustumBias)) {
                camera.far *= 4;
            }
            else {
                camera.far += this.lightFrustumBias;
            }
            camera.left = min[0];
            camera.right = max[0];
            camera.top = max[1];
            camera.bottom = min[1];
            camera.update(true);

            return camera;
        };
    })(),

    _getSpotLightCamera: function (light) {
        if (!this._lightCameras.spot) {
            this._lightCameras.spot = new PerspectiveCamera();
        }
        var camera = this._lightCameras.spot;
        // Update properties
        camera.fov = light.penumbraAngle * 2;
        camera.far = light.range;
        camera.worldTransform.copy(light.worldTransform);
        camera.updateProjectionMatrix();
        mat4.invert(camera.viewMatrix.array, camera.worldTransform.array);

        return camera;
    },

    /**
     * @param  {clay.Renderer|WebGLRenderingContext} [renderer]
     * @memberOf clay.prePass.ShadowMap.prototype
     */
    // PENDING Renderer or WebGLRenderingContext
    dispose: function (renderer) {
        var _gl = renderer.gl || renderer;

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
                shader.undefine('fragment', 'POINT_LIGHT_SHADOW_COUNT');
                shader.undefine('fragment', 'DIRECTIONAL_LIGHT_SHADOW_COUNT');
                shader.undefine('fragment', 'AMBIENT_LIGHT_SHADOW_COUNT');
                material.set('shadowEnabled', 0);
            }
        }

        this._opaqueCasters = [];
        this._receivers = [];
        this._lightsCastShadow = [];
    }
});

/**
 * @name clay.prePass.ShadowMap.VSM
 * @type {number}
 */
ShadowMapPass.VSM = 1;

/**
 * @name clay.prePass.ShadowMap.PCF
 * @type {number}
 */
ShadowMapPass.PCF = 2;

export default ShadowMapPass;
