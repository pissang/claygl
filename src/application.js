
/**
 * Helpers for creating a common 3d application.
 * @namespace clay.application
 */

 // TODO createCompositor
 // TODO Dispose test. geoCache test.
 // TODO Tonemapping exposure
 // TODO fitModel.
 // TODO Particle ?
import Renderer from './Renderer';
import Scene from './Scene';
import Timeline from './Timeline';
import CubeGeo from './geometry/Cube';
import SphereGeo from './geometry/Sphere';
import PlaneGeo from './geometry/Plane';
import ParametricSurfaceGeo from './geometry/ParametricSurface';
import Texture2D from './Texture2D';
import TextureCube from './TextureCube';
import Texture from './Texture';
import Mesh from './Mesh';
import Material from './Material';
import PerspectiveCamera from './camera/Perspective';
import OrthographicCamera from './camera/Orthographic';
import Vector3 from './math/Vector3';
import GLTFLoader from './loader/GLTF';
import Node from './Node';
import DirectionalLight from './light/Directional';
import PointLight from './light/Point';
import SpotLight from './light/Spot';
import AmbientLight from './light/Ambient';
import AmbientCubemapLight from './light/AmbientCubemap';
import AmbientSHLight from './light/AmbientSH';
import ShadowMapPass from './prePass/ShadowMap';
import RayPicking from './picking/RayPicking';
import LRUCache from './core/LRU';
import util from './core/util';
import shUtil from './util/sh';
import textureUtil from './util/texture';
import vendor from './core/vendor';

import colorUtil from './core/color';
var parseColor = colorUtil.parseToFloat;

import shaderLibrary from './shader/builtin';
import Shader from './Shader';


var EVE_NAMES = ['click', 'dblclick', 'mouseover', 'mouseout', 'mousemove',
    'touchstart', 'touchend', 'touchmove',
    'mousewheel', 'DOMMouseScroll'
];

/**
 * @typedef {string|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} ImageLike
 */
/**
 * @typedef {string|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement|clay.Texture2D} TextureLike
 */
/**
 * @typedef {string|Array.<number>} Color
 */
/**
 * @typedef {HTMLElement|string} DomQuery
 */

/**
 * @typedef {Object} App3DNamespace
 * @property {Function} init Initialization callback that will be called when initing app.
 *                      You can return a promise in init to start the loop asynchronously when the promise is resolved.
 * @property {Function} loop Loop callback that will be called each frame.
 * @property {boolean} [autoRender=true] If render automatically each frame.
 * @property {Function} [beforeRender]
 * @property {Function} [afterRender]
 * @property {number} [width] Container width.
 * @property {number} [height] Container height.
 * @property {number} [devicePixelRatio]
 * @property {Object.<string, Function>} [methods] Methods that will be injected to App3D#methods.
 * @property {Object} [graphic] Graphic configuration including shadow, color space.
 * @property {boolean} [graphic.shadow=false] If enable shadow
 * @property {boolean} [graphic.linear=false] If use linear color space
 * @property {boolean} [graphic.tonemapping=false] If enable ACES tone mapping.
 * @property {boolean} [event=false] If enable mouse/touch event. It will slow down the system if geometries are complex.
 */

/**
 * @typedef {Object} StandardMaterialMRConfig
 * @property {string} [name]
 * @property {string} [shader='standardMR']
 * @property {Color} [color]
 * @property {number} [alpha]
 * @property {number} [metalness]
 * @property {number} [roughness]
 * @property {Color} [emission]
 * @property {number} [emissionIntensity]
 * @property {boolean} [transparent]
 * @property {TextureLike} [diffuseMap]
 * @property {TextureLike} [normalMap]
 * @property {TextureLike} [roughnessMap]
 * @property {TextureLike} [metalnessMap]
 * @property {TextureLike} [emissiveMap]
 */

/**
 * Using App3D is a much more convenient way to create and manage your 3D application.
 *
 * It provides the abilities to:
 *
 * + Manage application loop and rendering.
 * + Collect GPU resource automatically without memory leak concern.
 * + Mouse event management.
 * + Create scene objects, materials, textures with simpler code.
 * + Load models with one line of code.
 * + Promised interfaces.
 *
 * Here is a basic example to create a rotating cube.
 *
```js
var app = clay.application.create('#viewport', {
    init: function (app) {
        // Create a perspective camera.
        // First parameter is the camera position. Which is in front of the cube.
        // Second parameter is the camera lookAt target. Which is the origin of the world, and where the cube puts.
        this._camera = app.createCamera([0, 2, 5], [0, 0, 0]);
        // Create a sample cube
        this._cube = app.createCube();
        // Create a directional light. The direction is from top right to left bottom, away from camera.
        this._mainLight = app.createDirectionalLight([-1, -1, -1]);
    },
    loop: function (app) {
        // Simply rotating the cube every frame.
        this._cube.rotation.rotateY(app.frameTime / 1000);
    }
});
```
 * @constructor
 * @alias clay.application.App3D
 * @param {DomQuery} dom Container dom element or a selector string that can be used in `querySelector`
 * @param {App3DNamespace} appNS Options and namespace used in creating app3D
 */
function App3D(dom, appNS) {

    appNS = appNS || {};
    appNS.graphic = appNS.graphic || {};

    if (appNS.autoRender == null) {
        appNS.autoRender = true;
    }

    if (typeof dom === 'string') {
        dom = document.querySelector(dom);
    }

    if (!dom) { throw new Error('Invalid dom'); }

    var isDomCanvas = !dom.nodeName  // Not in dom environment
        || dom.nodeName.toUpperCase() === 'CANVAS';

    var rendererOpts = {};
    isDomCanvas && (rendererOpts.canvas = dom);
    appNS.devicePixelRatio && (rendererOpts.devicePixelRatio = appNS.devicePixelRatio);

    var gRenderer = new Renderer(rendererOpts);
    var gWidth = appNS.width || dom.clientWidth;
    var gHeight = appNS.height || dom.clientHeight;

    var gScene = new Scene();
    var gTimeline = new Timeline();
    var gShadowPass = appNS.graphic.shadow && new ShadowMapPass();
    var gRayPicking = appNS.event && new RayPicking({
        scene: gScene,
        renderer: gRenderer
    });

    !isDomCanvas && dom.appendChild(gRenderer.canvas);

    gRenderer.resize(gWidth, gHeight);

    var gFrameTime = 0;
    var gElapsedTime = 0;

    gTimeline.start();

    var userMethods = {};
    for (var key in appNS.methods) {
        userMethods[key] = appNS.methods[key].bind(appNS, this);
    }

    Object.defineProperties(this, {
        /**
         * Container dom element
         * @name clay.application.App3D#container
         * @type {HTMLElement}
         */
        container: { get: function () { return dom; } },
        /**
         * @name clay.application.App3D#renderer
         * @type {clay.Renderer}
         */
        renderer: { get: function () { return gRenderer; }},
        /**
         * @name clay.application.App3D#scene
         * @type {clay.Renderer}
         */
        scene: { get: function () { return gScene; }},
        /**
         * @name clay.application.App3D#timeline
         * @type {clay.Renderer}
         */
        timeline: { get: function () { return gTimeline; }},
        /**
         * Time elapsed since last frame. Can be used in loop to calculate the movement.
         * @name clay.application.App3D#frameTime
         * @type {number}
         */
        frameTime: { get: function () { return gFrameTime; }},
        /**
         * Time elapsed since application created.
         * @name clay.application.App3D#elapsedTime
         * @type {number}
         */
        elapsedTime: { get: function () { return gElapsedTime; }},

        /**
         * Width of viewport.
         * @name clay.application.App3D#width
         * @type {number}
         */
        width: { get: function () { return gRenderer.getWidth(); }},
        /**
         * Height of viewport.
         * @name clay.application.App3D#height
         * @type {number}
         */
        height: { get: function () { return gRenderer.getHeight(); }},

        /**
         * Methods from {@link clay.application.create}
         * @name clay.application.App3D#methods
         * @type {number}
         */
        methods: { get: function () { return userMethods; } },

        _shadowPass: { get: function () { return gShadowPass; } },

        _appNS: { get: function () { return appNS; } },
    });

    /**
     * Resize the application. Will use the container clientWidth/clientHeight if width/height in parameters are not given.
     * @function
     * @memberOf {clay.application.App3D}
     * @param {number} [width]
     * @param {number} [height]
     */
    this.resize = function (width, height) {
        gWidth = width || appNS.width || dom.clientWidth;
        gHeight = height || dom.height || dom.clientHeight;
        gRenderer.resize(gWidth, gHeight);
    };

    /**
     * Dispose the application
     * @function
     */
    this.dispose = function () {
        this._disposed = true;

        if (appNS.dispose) {
            appNS.dispose(this);
        }
        gTimeline.stop();
        gRenderer.disposeScene(gScene);
        gShadowPass && gShadowPass.dispose(gRenderer);

        dom.innerHTML = '';
        EVE_NAMES.forEach(function (eveType) {
            this[makeHandlerName(eveType)] && vendor.removeEventListener(dom, makeHandlerName(eveType));
        }, this);
    };

    gRayPicking && this._initMouseEvents(gRayPicking);

    this._geoCache = new LRUCache(20);
    this._texCache = new LRUCache(20);

    // GPU Resources.
    this._texturesList = {};
    this._geometriesList = {};

    // Do init the application.
    var initPromise = Promise.resolve(appNS.init && appNS.init(this));
    // Use the inited camera.
    gRayPicking && (gRayPicking.camera = gScene.getMainCamera());

    if (!appNS.loop) {
        console.warn('Miss loop method.');
    }

    var self = this;
    initPromise.then(function () {
        gTimeline.on('frame', function (frameTime) {
            gFrameTime = frameTime;
            gElapsedTime += frameTime;

            var camera = gScene.getMainCamera();
            if (camera) {
                camera.aspect = gRenderer.getViewportAspect();
            }
            gRayPicking && (gRayPicking.camera = camera);

            appNS.loop && appNS.loop(self);

            if (appNS.autoRender) {
                self.render();
            }

            self.collectResources();
        }, this);
    });

    gScene.on('beforerender', function (renderer, scene, camera, renderList) {
        if (this._inRender) {
            // Only update graphic options when using #render function.
            this._updateGraphicOptions(appNS.graphic, renderList.opaque, false);
            this._updateGraphicOptions(appNS.graphic, renderList.transparent, false);
        }
    }, this);
}

function isImageLikeElement(val) {
    return (typeof Image !== 'undefined' && val instanceof Image)
        || (typeof HTMLCanvasElement !== 'undefined' && val instanceof HTMLCanvasElement)
        || (typeof HTMLVideoElement !== 'undefined' && val instanceof HTMLVideoElement);
}

function getKeyFromImageLike(val) {
    return typeof val === 'string'
        ? val : (val.__key__ || (val.__key__ = util.genGUID()));
}

function makeHandlerName(eveType) {
    return '_' + eveType + 'Handler';
}

function packageEvent(eventType, pickResult, offsetX, offsetY, wheelDelta) {
    var event = util.clone(pickResult);
    event.type = eventType;
    event.offsetX = offsetX;
    event.offsetY = offsetY;
    if (wheelDelta !== null) {
        event.wheelDelta = wheelDelta;
    }
    return event;
}

function bubblingEvent(target, event) {
    while (target && !event.cancelBubble) {
        target.trigger(event.type, event);
        target = target.getParent();
    }
}

App3D.prototype._initMouseEvents = function (rayPicking) {
    var dom = this.container;

    var oldTarget = null;
    EVE_NAMES.forEach(function (_eveType) {
        vendor.addEventListener(dom, _eveType, this[makeHandlerName(_eveType)] = function (e) {
            if (!rayPicking.camera) { // Not have camera yet.
                return;
            }
            e.preventDefault && e.preventDefault();

            var box = dom.getBoundingClientRect();
            var offsetX, offsetY;
            var eveType = _eveType;

            if (eveType.indexOf('touch') >= 0) {
                var touch = eveType !== 'touchend'
                    ? e.targetTouches[0]
                    : e.changedTouches[0];
                if (eveType === 'touchstart') {
                    eveType = 'mousedown';
                }
                else if (eveType === 'touchend') {
                    eveType = 'mouseup';
                }
                else if (eveType === 'touchmove') {
                    eveType = 'mousemove';
                }
                offsetX = touch.clientX - box.left;
                offsetY = touch.clientY - box.top;
            }
            else {
                offsetX = e.clientX - box.left;
                offsetY = e.clientY - box.top;
            }

            var pickResult = rayPicking.pick(offsetX, offsetY);

            var delta;
            if (eveType === 'DOMMouseScroll' || eveType === 'mousewheel') {
                delta = (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
            }

            if (pickResult) {
                // Just ignore silent element.
                if (pickResult.target.silent) {
                    return;
                }

                if (eveType === 'mousemove') {
                    // PENDING touchdown should trigger mouseover event ?
                    var targetChanged = pickResult.target !== oldTarget;
                    if (targetChanged) {
                        oldTarget && bubblingEvent(oldTarget, packageEvent('mouseout', {
                            target: oldTarget
                        }, offsetX, offsetY));
                    }
                    bubblingEvent(pickResult.target, packageEvent('mousemove', pickResult, offsetX, offsetY));
                    if (targetChanged) {
                        bubblingEvent(pickResult.target, packageEvent('mouseover', pickResult, offsetX, offsetY));
                    }
                }
                else {
                    bubblingEvent(pickResult.target, packageEvent(eveType, pickResult, offsetX, offsetY, delta));
                }
                oldTarget = pickResult.target;
            }
            else if (oldTarget) {
                bubblingEvent(oldTarget, packageEvent('mouseout', {
                    target: oldTarget
                }, offsetX, offsetY));
                oldTarget = null;
            }
        });
    }, this);
};

App3D.prototype._updateGraphicOptions = function (graphicOpts, list, isSkybox) {
    var enableTonemapping = !!graphicOpts.tonemapping;
    var isLinearSpace = !!graphicOpts.linear;

    var prevMaterial;

    for (var i = 0; i < list.length; i++) {
        var mat = list[i].material;
        if (mat === prevMaterial) {
            continue;
        }

        enableTonemapping ? mat.define('fragment', 'TONEMAPPING') : mat.undefine('fragment', 'TONEMAPPING');
        if (isLinearSpace) {
            var decodeSRGB = true;
            if (isSkybox && mat.get('environmentMap') && !mat.get('environmentMap').sRGB) {
                decodeSRGB = false;
            }
            decodeSRGB && mat.define('fragment', 'SRGB_DECODE');
            mat.define('fragment', 'SRGB_ENCODE');
        }
        else {
            mat.undefine('fragment', 'SRGB_DECODE');
            mat.undefine('fragment', 'SRGB_ENCODE');
        }

        prevMaterial = mat;
    }
};

App3D.prototype._doRender = function (renderer, scene) {
    var camera = scene.getMainCamera();
    renderer.render(scene, camera, true);
};

/**
 * Do render
 */
App3D.prototype.render = function () {
    this._inRender = true;
    var appNS = this._appNS;
    appNS.beforeRender && appNS.beforeRender(self);

    var scene = this.scene;
    var renderer = this.renderer;
    var shadowPass = this._shadowPass;

    scene.update();
    var skyboxList = [];
    scene.skybox && skyboxList.push(scene.skybox);
    scene.skydome && skyboxList.push(scene.skydome);

    this._updateGraphicOptions(appNS.graphic, skyboxList, true);
    // Render shadow pass
    shadowPass && shadowPass.render(renderer, scene, null, true);

    this._doRender(renderer, scene, true);

    appNS.afterRender && appNS.afterRender(self);
    this._inRender = false;
};

App3D.prototype.collectResources = function () {
    var renderer = this.renderer;
    var scene = this.scene;
    var texturesList = this._texturesList;
    var geometriesList = this._geometriesList;
    // Mark all resources unused;
    markUnused(texturesList);
    markUnused(geometriesList);

    // Collect resources used in this frame.
    var newTexturesList = [];
    var newGeometriesList = [];
    collectResources(scene, newTexturesList, newGeometriesList);

    // Dispose those unsed resources.
    checkAndDispose(renderer, texturesList);
    checkAndDispose(renderer, geometriesList);

    this._texturesList = newTexturesList;
    this._geometriesList = newGeometriesList;
};


function markUnused(resourceList) {
    for (var i = 0; i < resourceList.length; i++) {
        resourceList[i].__used = 0;
    }
}

function checkAndDispose(renderer, resourceList) {
    for (var i = 0; i < resourceList.length; i++) {
        if (!resourceList[i].__used) {
            resourceList[i].dispose(renderer);
        }
    }
}

function updateUsed(resource, list) {
    resource.__used = resource.__used || 0;
    resource.__used++;
    if (resource.__used === 1) {
        // Don't push to the list twice.
        list.push(resource);
    }
}
function collectResources(scene, textureResourceList, geometryResourceList) {
    var prevMaterial;
    var prevGeometry;
    scene.traverse(function (renderable) {
        if (renderable.isRenderable()) {
            var geometry = renderable.geometry;
            var material = renderable.material;

            // TODO optimize!!
            if (material !== prevMaterial) {
                var textureUniforms = material.getTextureUniforms();
                for (var u = 0; u < textureUniforms.length; u++) {
                    var uniformName = textureUniforms[u];
                    var val = material.uniforms[uniformName].value;
                    var uniformType = material.uniforms[uniformName].type;
                    if (!val) {
                        continue;
                    }
                    if (uniformType === 't') {
                        updateUsed(val, textureResourceList);
                    }
                    else if (uniformType === 'tv') {
                        for (var k = 0; k < val.length; k++) {
                            if (val[k]) {
                                updateUsed(val[k], textureResourceList);
                            }
                        }
                    }
                }
            }
            if (geometry !== prevGeometry) {
                updateUsed(geometry, geometryResourceList);
            }

            prevMaterial = material;
            prevGeometry = geometry;
        }
    });

    for (var k = 0; k < scene.lights.length; k++) {
        // Track AmbientCubemap
        if (scene.lights[k].cubemap) {
            updateUsed(scene.lights[k].cubemap, textureResourceList);
        }
    }
}
/**
 * Load a texture from image or string.
 * @param {ImageLike} img
 * @param {Object} [opts] Texture options.
 * @param {boolean} [opts.flipY=true] If flipY. See {@link clay.Texture.flipY}
 * @param {boolean} [opts.convertToPOT=false] Force convert None Power of Two texture to Power of two so it can be tiled.
 * @param {number} [opts.anisotropic] Anisotropic filtering. See {@link clay.Texture.anisotropic}
 * @param {number} [opts.wrapS=clay.Texture.REPEAT] See {@link clay.Texture.wrapS}
 * @param {number} [opts.wrapT=clay.Texture.REPEAT] See {@link clay.Texture.wrapT}
 * @param {number} [opts.minFilter=clay.Texture.LINEAR_MIPMAP_LINEAR] See {@link clay.Texture.minFilter}
 * @param {number} [opts.magFilter=clay.Texture.LINEAR] See {@link clay.Texture.magFilter}
 * @param {number} [opts.exposure] Only be used when source is a HDR image.
 * @param {boolean} [useCache] If use cache.
 * @return {Promise}
 * @example
 *  app.loadTexture('diffuseMap.jpg')
 *      .then(function (texture) {
 *          material.set('diffuseMap', texture);
 *      });
 */
App3D.prototype.loadTexture = function (urlOrImg, opts, useCache) {
    var self = this;
    var key = getKeyFromImageLike(urlOrImg);
    if (useCache) {
        if (this._texCache.get(key)) {
            return this._texCache.get(key);
        }
    }
    // TODO Promise ?
    var promise = new Promise(function (resolve, reject) {
        var texture = self.loadTextureSync(urlOrImg, opts);
        if (!texture.isRenderable()) {
            texture.success(function () {
                if (self._disposed) {
                    return;
                }
                resolve(texture);
            });
            texture.error(function () {
                if (self._disposed) {
                    return;
                }
                reject();
            });
        }
        else {
            resolve(texture);
        }
    });
    if (useCache) {
        this._texCache.put(key, promise);
    }
    return promise;
};

/**
 * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
 * @param {ImageLike} img
 * @param {Object} [opts] Texture options.
 * @param {boolean} [opts.flipY=true] If flipY. See {@link clay.Texture.flipY}
 * @param {boolean} [opts.convertToPOT=false] Force convert None Power of Two texture to Power of two so it can be tiled.
 * @param {number} [opts.anisotropic] Anisotropic filtering. See {@link clay.Texture.anisotropic}
 * @param {number} [opts.wrapS=clay.Texture.REPEAT] See {@link clay.Texture.wrapS}
 * @param {number} [opts.wrapT=clay.Texture.REPEAT] See {@link clay.Texture.wrapT}
 * @param {number} [opts.minFilter=clay.Texture.LINEAR_MIPMAP_LINEAR] See {@link clay.Texture.minFilter}
 * @param {number} [opts.magFilter=clay.Texture.LINEAR] See {@link clay.Texture.magFilter}
 * @param {number} [opts.exposure] Only be used when source is a HDR image.
 * @return {clay.Texture2D}
 * @example
 *  var texture = app.loadTexture('diffuseMap.jpg', {
 *      anisotropic: 8,
 *      flipY: false
 *  });
 *  material.set('diffuseMap', texture);
 */
App3D.prototype.loadTextureSync = function (urlOrImg, opts) {
    var texture = new Texture2D(opts);
    if (typeof urlOrImg === 'string') {
        if (urlOrImg.match(/.hdr$|^data:application\/octet-stream/)) {
            texture = textureUtil.loadTexture(urlOrImg, {
                exposure: opts && opts.exposure,
                fileType: 'hdr'
            }, function () {
                texture.dirty();
                texture.trigger('success');
            });
            for (var key in opts) {
                texture[key] = opts[key];
            }
        }
        else {
            texture.load(urlOrImg);
        }
    }
    else if (isImageLikeElement(urlOrImg)) {
        texture.image = urlOrImg;
        texture.dynamic = urlOrImg instanceof HTMLVideoElement;
    }
    return texture;
};

/**
 * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
 * @param {ImageLike} img
 * @param {Object} [opts] Texture options.
 * @param {boolean} [opts.flipY=false] If flipY. See {@link clay.Texture.flipY}
 * @return {Promise}
 * @example
 *  app.loadTextureCube({
 *      px: 'skybox/px.jpg', py: 'skybox/py.jpg', pz: 'skybox/pz.jpg',
 *      nx: 'skybox/nx.jpg', ny: 'skybox/ny.jpg', nz: 'skybox/nz.jpg'
 *  }).then(function (texture) {
 *      skybox.setEnvironmentMap(texture);
 *  })
 */
App3D.prototype.loadTextureCube = function (imgList, opts) {
    var textureCube = this.loadTextureCubeSync(imgList, opts);
    return new Promise(function (resolve, reject) {
        if (textureCube.isRenderable()) {
            resolve(textureCube);
        }
        else {
            textureCube.success(function () {
                resolve(textureCube);
            }).error(function () {
                reject();
            });
        }
    });
};

/**
 * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
 * @param {ImageLike} img
 * @param {Object} [opts] Texture options.
 * @param {boolean} [opts.flipY=false] If flipY. See {@link clay.Texture.flipY}
 * @return {clay.TextureCube}
 * @example
 *  var texture = app.loadTextureCubeSync({
 *      px: 'skybox/px.jpg', py: 'skybox/py.jpg', pz: 'skybox/pz.jpg',
 *      nx: 'skybox/nx.jpg', ny: 'skybox/ny.jpg', nz: 'skybox/nz.jpg'
 *  });
 *  skybox.setEnvironmentMap(texture);
 */
App3D.prototype.loadTextureCubeSync = function (imgList, opts) {
    opts = opts || {};
    opts.flipY = opts.flipY || false;
    var textureCube = new TextureCube(opts);
    if (!imgList || !imgList.px || !imgList.nx || !imgList.py || !imgList.ny || !imgList.pz || !imgList.nz) {
        throw new Error('Invalid cubemap format. Should be an object including px,nx,py,ny,pz,nz');
    }
    if (typeof imgList.px === 'string') {
        textureCube.load(imgList);
    }
    else {
        textureCube.image = util.clone(imgList);
    }
    return textureCube;
};

/**
 * Create a material.
 * @param {Object|StandardMaterialMRConfig} materialConfig. materialConfig contains `shader`, `transparent` and uniforms that used in corresponding uniforms.
 *                                 Uniforms can be `color`, `alpha` `diffuseMap` etc.
 * @param {string|clay.Shader} [shader='clay.standardMR'] Default to be standard shader with metalness and roughness workflow.
 * @param {boolean} [transparent=false] If material is transparent.
 * @param {boolean} [textureConvertToPOT=false] Force convert None Power of Two texture to Power of two so it can be tiled.
 * @param {boolean} [textureFlipY=true] If flip y of texture.
 * @param {Function} [textureLoaded] Callback when single texture loaded.
 * @param {Function} [texturesReady] Callback when all texture loaded.
 * @return {clay.Material}
 */
App3D.prototype.createMaterial = function (matConfig) {
    matConfig = matConfig || {};
    matConfig.shader = matConfig.shader || 'clay.standardMR';
    var shader = matConfig.shader instanceof Shader ? matConfig.shader : shaderLibrary.get(matConfig.shader);
    var material = new Material({
        shader: shader
    });
    if (matConfig.name) {
        material.name = matConfig.name;
    }

    var texturesLoading = [];
    function makeTextureSetter(key) {
        return function (texture) {
            material.setUniform(key, texture);
            matConfig.textureLoaded && matConfig.textureLoaded(key, texture);
            return texture;
        };
    }
    for (var key in matConfig) {
        if (material.uniforms[key]) {
            var val = matConfig[key];
            if ((material.uniforms[key].type === 't' || isImageLikeElement(val))
                && !(val instanceof Texture)
            ) {
                // Try to load a texture.
                texturesLoading.push(this.loadTexture(val, {
                    convertToPOT: matConfig.textureConvertToPOT || false,
                    flipY: matConfig.textureFlipY == null ? true : matConfig.textureFlipY
                }).then(makeTextureSetter(key)));
            }
            else {
                material.setUniform(key, val);
            }
        }
    }

    if (matConfig.transparent) {
        matConfig.depthMask = false;
        matConfig.transparent = true;
    }


    if (matConfig.texturesReady) {
        Promise.all(texturesLoading).then(function (textures) {
            matConfig.texturesReady(textures);
        });
    }

    return material;
};

/**
 * Create a cube mesh and add it to the scene or the given parent node.
 * @function
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @param {Array.<number>|number} [subdivision=1] Subdivision of cube.
 *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
 * @return {clay.Mesh}
 * @example
 *  // Create a white cube.
 *  app.createCube()
 */
App3D.prototype.createCube = function (material, parentNode, subdiv) {
    if (subdiv == null) {
        subdiv = 1;
    }
    if (typeof subdiv === 'number') {
        subdiv = [subdiv, subdiv, subdiv];
    }

    var geoKey = 'cube-' + subdiv.join('-');
    var cube = this._geoCache.get(geoKey);
    if (!cube) {
        cube = new CubeGeo({
            widthSegments: subdiv[0],
            heightSegments: subdiv[1],
            depthSegments: subdiv[2]
        });
        cube.generateTangents();
        this._geoCache.put(geoKey, cube);
    }
    return this.createMesh(cube, material, parentNode);
};

/**
 * Create a cube mesh that camera is inside the cube.
 * @function
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @param {Array.<number>|number} [subdivision=1] Subdivision of cube.
 *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
 * @return {clay.Mesh}
 * @example
 *  // Create a white cube inside.
 *  app.createCubeInside()
 */
App3D.prototype.createCubeInside = function (material, parentNode, subdiv) {
    if (subdiv == null) {
        subdiv = 1;
    }
    if (typeof subdiv === 'number') {
        subdiv = [subdiv, subdiv, subdiv];
    }
    var geoKey = 'cubeInside-' + subdiv.join('-');
    var cube = this._geoCache.get(geoKey);
    if (!cube) {
        cube = new CubeGeo({
            inside: true,
            widthSegments: subdiv[0],
            heightSegments: subdiv[1],
            depthSegments: subdiv[2]
        });
        cube.generateTangents();
        this._geoCache.put(geoKey, cube);
    }

    return this.createMesh(cube, material, parentNode);
};

/**
 * Create a sphere mesh and add it to the scene or the given parent node.
 * @function
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @param {number} [subdivision=20] Subdivision of sphere.
 * @return {clay.Mesh}
 * @example
 *  // Create a semi-transparent sphere.
 *  app.createSphere({
 *      color: [0, 0, 1],
 *      transparent: true,
 *      alpha: 0.5
 *  })
 */
App3D.prototype.createSphere = function (material, parentNode, subdivision) {
    if (subdivision == null) {
        subdivision = 20;
    }
    var geoKey = 'sphere-' + subdivision;
    var sphere = this._geoCache.get(geoKey);
    if (!sphere) {
        sphere = new SphereGeo({
            widthSegments: subdivision * 2,
            heightSegments: subdivision
        });
        sphere.generateTangents();
        this._geoCache.put(geoKey, sphere);
    }
    return this.createMesh(sphere, material, parentNode);
};

// TODO may be modified?
/**
 * Create a plane mesh and add it to the scene or the given parent node.
 * @function
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @param {Array.<number>|number} [subdivision=1] Subdivision of plane.
 *          Can be a number to represent both width and height dimensions. Or an array to represent them respectively.
 * @return {clay.Mesh}
 * @example
 *  // Create a red color plane.
 *  app.createPlane({
 *      color: [1, 0, 0]
 *  })
 */
App3D.prototype.createPlane = function (material, parentNode, subdiv) {
    if (subdiv == null) {
        subdiv = 1;
    }
    if (typeof subdiv === 'number') {
        subdiv = [subdiv, subdiv];
    }
    var geoKey = 'plane-' + subdiv.join('-');
    var planeGeo = this._geoCache.get(geoKey);
    if (!planeGeo) {
        planeGeo = new PlaneGeo({
            widthSegments: subdiv[0],
            heightSegments: subdiv[1]
        });
        planeGeo.generateTangents();
        this._geoCache.put(geoKey, planeGeo);
    }
    return this.createMesh(planeGeo, material, parentNode);
};

/**
 * Create mesh with parametric surface function
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @param {Object} generator
 * @param {Function} generator.x
 * @param {Function} generator.y
 * @param {Function} generator.z
 * @param {Array} [generator.u=[0, 1, 0.05]]
 * @param {Array} [generator.v=[0, 1, 0.05]]
 * @return {clay.Mesh}
 */
App3D.prototype.createParametricSurface = function (material, parentNode, generator) {
    var geo = new ParametricSurfaceGeo({
        generator: generator
    });
    geo.generateTangents();
    return this.createMesh(geo, material, parentNode);
};


/**
 * Create a general mesh with given geometry instance and material config.
 * @param {clay.Geometry} geometry
 * @return {clay.Mesh}
 */
App3D.prototype.createMesh = function (geometry, mat, parentNode) {
    var mesh = new Mesh({
        geometry: geometry,
        material: mat instanceof Material ? mat : this.createMaterial(mat)
    });
    parentNode = parentNode || this.scene;
    parentNode.add(mesh);
    return mesh;
};

/**
 * Create an empty node
 * @param {clay.Node} parentNode
 * @return {clay.Node}
 */
App3D.prototype.createNode = function (parentNode) {
    var node = new Node();
    parentNode = parentNode || this.scene;
    parentNode.add(node);
    return node;
};

/**
 * Create a perspective or orthographic camera and add it to the scene.
 * @param {Array.<number>|clay.Vector3} position
 * @param {Array.<number>|clay.Vector3} target
 * @param {string} [type="perspective"] Can be 'perspective' or 'orthographic'(in short 'ortho')
 * @param {Array.<number>|clay.Vector3} [extent] Extent is available only if type is orthographic.
 * @return {clay.camera.Perspective|clay.camera.Orthographic}
 */
App3D.prototype.createCamera = function (position, target, type, extent) {
    var CameraCtor;
    var isOrtho = false;
    if (type === 'ortho' || type === 'orthographic') {
        isOrtho = true;
        CameraCtor = OrthographicCamera;
    }
    else {
        if (type && type !== 'perspective') {
            console.error('Unkown camera type ' + type + '. Use default perspective camera');
        }
        CameraCtor = PerspectiveCamera;
    }

    var camera = new CameraCtor();
    if (position instanceof Vector3) {
        camera.position.copy(position);
    }
    else if (position instanceof Array) {
        camera.position.setArray(position);
    }

    if (target instanceof Array) {
        target = new Vector3(target[0], target[1], target[2]);
    }
    if (target instanceof Vector3) {
        camera.lookAt(target);
    }

    if (extent && isOrtho) {
        extent = extent.array || extent;
        camera.left = -extent[0] / 2;
        camera.right = extent[0] / 2;
        camera.top = extent[1] / 2;
        camera.bottom = -extent[1] / 2;
        camera.near = 0;
        camera.far = extent[2];
    }
    else {
        camera.aspect = this.renderer.getViewportAspect();
    }

    this.scene.add(camera);

    return camera;
};

/**
 * Create a directional light and add it to the scene.
 * @param {Array.<number>|clay.Vector3} dir A Vector3 or array to represent the direction.
 * @param {Color} [color='#fff'] Color of directional light, default to be white.
 * @param {number} [intensity] Intensity of directional light, default to be 1.
 *
 * @example
 *  app.createDirectionalLight([-1, -1, -1], '#fff', 2);
 */
App3D.prototype.createDirectionalLight = function (dir, color, intensity) {
    var light = new DirectionalLight();
    if (dir instanceof Vector3) {
        dir = dir.array;
    }
    light.position.setArray(dir).negate();
    light.lookAt(Vector3.ZERO);
    if (typeof color === 'string') {
        color = parseColor(color);
    }
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this.scene.add(light);
    return light;
};

/**
 * Create a spot light and add it to the scene.
 * @param {Array.<number>|clay.Vector3} position Position of the spot light.
 * @param {Array.<number>|clay.Vector3} [target] Target position where spot light points to.
 * @param {number} [range=20] Falloff range of spot light. Default to be 20.
 * @param {Color} [color='#fff'] Color of spot light, default to be white.
 * @param {number} [intensity=1] Intensity of spot light, default to be 1.
 * @param {number} [umbraAngle=30] Umbra angle of spot light. Default to be 30 degree from the middle line.
 * @param {number} [penumbraAngle=45] Penumbra angle of spot light. Default to be 45 degree from the middle line.
 *
 * @example
 *  app.createSpotLight([5, 5, 5], [0, 0, 0], 20, #900);
 */
App3D.prototype.createSpotLight = function (position, target, range, color, intensity, umbraAngle, penumbraAngle) {
    var light = new SpotLight();
    light.position.setArray(position instanceof Vector3 ? position.array : position);

    if (target instanceof Array) {
        target = new Vector3(target[0], target[1], target[2]);
    }
    if (target instanceof Vector3) {
        light.lookAt(target);
    }

    if (typeof color === 'string') {
        color = parseColor(color);
    }
    range != null && (light.range = range);
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);
    umbraAngle != null && (light.umbraAngle = umbraAngle);
    penumbraAngle != null && (light.penumbraAngle = penumbraAngle);

    this.scene.add(light);

    return light;
};

/**
 * Create a point light.
 * @param {Array.<number>|clay.Vector3} position Position of point light..
 * @param {number} [range=100] Falloff range of point light.
 * @param {Color} [color='#fff'] Color of point light.
 * @param {number} [intensity=1] Intensity of point light.
 */
App3D.prototype.createPointLight = function (position, range, color, intensity) {
    var light = new PointLight();
    light.position.setArray(position instanceof Vector3 ? position.array : position);

    if (typeof color === 'string') {
        color = parseColor(color);
    }
    range != null && (light.range = range);
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this.scene.add(light);

    return light;
};

/**
 * Create a ambient light.
 * @param {Color} [color='#fff'] Color of ambient light.
 * @param {number} [intensity=1] Intensity of ambient light.
 */
App3D.prototype.createAmbientLight = function (color, intensity) {
    var light = new AmbientLight();

    if (typeof color === 'string') {
        color = parseColor(color);
    }
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this.scene.add(light);

    return light;
};

/**
 * Create an cubemap ambient light and an spherical harmonic ambient light
 * for specular and diffuse lighting in PBR rendering
 * @param {ImageLike|TextureCube} [envImage] Panorama environment image, HDR format is better. Or a pre loaded texture cube
 * @param {number} [specularIntenstity=0.7] Intensity of specular light.
 * @param {number} [diffuseIntenstity=0.7] Intensity of diffuse light.
 * @param {number} [exposure=1] Exposure of HDR image. Only if image in first paramter is HDR.
 * @param {number} [prefilteredCubemapSize=32] The size of prefilerted cubemap. Larger value will take more time to do expensive prefiltering.
 * @return {Promise}
 */
App3D.prototype.createAmbientCubemapLight = function (envImage, specIntensity, diffIntensity, exposure, prefilteredCubemapSize) {
    var self = this;
    if (exposure == null) {
        exposure = 0;
    }
    if (prefilteredCubemapSize == null) {
        prefilteredCubemapSize = 32;
    }

    var scene = this.scene;

    var loadPromise;
    if (envImage.textureType === 'textureCube') {
        loadPromise = envImage.isRenderable()
            ? Promise.resolve(envImage)
            : new Promise(function (resolve, reject) {
                envImage.success(function () {
                    resolve(envImage);
                });
            });
    }
    else {
        loadPromise = this.loadTexture(envImage, {
            exposure: exposure
        });
    }

    return loadPromise.then(function (envTexture) {
        var specLight = new AmbientCubemapLight({
            intensity: specIntensity != null ? specIntensity : 0.7
        });
        specLight.cubemap = envTexture;
        envTexture.flipY = false;
        // TODO Cache prefilter ?
        specLight.prefilter(self.renderer, 32);

        var diffLight = new AmbientSHLight({
            intensity: diffIntensity != null ? diffIntensity : 0.7,
            coefficients: shUtil.projectEnvironmentMap(
                self.renderer, specLight.cubemap, {
                    lod: 1
                }
            )
        });
        scene.add(specLight);
        scene.add(diffLight);

        return {
            specular: specLight,
            diffuse: diffLight,
            // Original environment map
            environmentMap: envTexture
        };
    });
};

/**
 * Load a [glTF](https://github.com/KhronosGroup/glTF) format model.
 * You can convert FBX/DAE/OBJ format models to [glTF](https://github.com/KhronosGroup/glTF) with [fbx2gltf](https://github.com/pissang/claygl#fbx-to-gltf20-converter) python script,
 * or simply using the [Clay Viewer](https://github.com/pissang/clay-viewer) client application.
 * @param {string} url
 * @param {Object} opts
 * @param {string|clay.Shader} [opts.shader='clay.standard'] 'basic'|'lambert'|'standard'.
 * @param {boolean} [opts.waitTextureLoaded=false] If add to scene util textures are all loaded.
 * @param {boolean} [opts.autoPlayAnimation=true] If autoplay the animation of model.
 * @param {boolean} [opts.upAxis='y'] Change model to y up if upAxis is 'z'
 * @param {boolean} [opts.textureFlipY=false]
 * @param {boolean} [opts.textureConvertToPOT=false] If convert texture to power-of-two
 * @param {string} [opts.textureRootPath] Root path of texture. Default to be relative with glTF file.
 * @param {clay.Node} [parentNode] Parent node that model will be mounted. Default to be scene
 * @return {Promise}
 */
App3D.prototype.loadModel = function (url, opts, parentNode) {
    if (typeof url !== 'string') {
        throw new Error('Invalid URL.');
    }

    opts = opts || {};
    if (opts.autoPlayAnimation == null) {
        opts.autoPlayAnimation = true;
    }
    var shader = opts.shader || 'clay.standard';

    var loaderOpts = {
        rootNode: new Node(),
        shader: shader,
        textureRootPath: opts.textureRootPath,
        crossOrigin: 'Anonymous',
        textureFlipY: opts.textureFlipY,
        textureConvertToPOT: opts.textureConvertToPOT
    };
    if (opts.upAxis && opts.upAxis.toLowerCase() === 'z') {
        loaderOpts.rootNode.rotation.identity().rotateX(-Math.PI / 2);
    }

    var loader = new GLTFLoader(loaderOpts);

    parentNode = parentNode || this.scene;
    var timeline = this.timeline;
    var self = this;

    return new Promise(function (resolve, reject) {
        function afterLoad(result) {
            if (self._disposed) {
                return;
            }

            parentNode.add(result.rootNode);
            if (opts.autoPlayAnimation) {
                result.clips.forEach(function (clip) {
                    timeline.addClip(clip);
                });
            }
            resolve(result);
        }
        loader.success(function (result) {
            if (self._disposed) {
                return;
            }

            if (!opts.waitTextureLoaded) {
                afterLoad(result);
            }
            else {
                Promise.all(result.textures.map(function (texture) {
                    if (texture.isRenderable()) {
                        return Promise.resolve(texture);
                    }
                    return new Promise(function (resolve) {
                        texture.success(resolve);
                        texture.error(resolve);
                    });
                })).then(function () {
                    afterLoad(result);
                }).catch(function () {
                    afterLoad(result);
                });
            }
        });
        loader.error(function () {
            reject();
        });
        loader.load(url);
    });
};


// TODO cloneModel

/**
 * Similar to `app.scene.cloneNode`, except it will mount the cloned node to the scene automatically.
 * See more in {@link clay.Scene#cloneNode}
 *
 * @param {clay.Node} node
 * @param {clay.Node} [parentNode] Parent node that new cloned node will be mounted.
 *          Default to have same parent with source node.
 * @return {clay.Node}
 */
App3D.prototype.cloneNode = function (node, parentNode) {
    parentNode = parentNode || node.getParent();

    var newNode = this.scene.cloneNode(node, parentNode);
    if (parentNode) {
        parentNode.add(newNode);
    }

    return newNode;
};


export default {
    App3D: App3D,
    /**
     * Create a 3D application that will manage the app initialization and loop.
     *
     * See more details at {@link clay.application.App3D}
     *
     * @name clay.application.create
     * @method
     * @param {HTMLElement|string} dom Container dom element or a selector string that can be used in `querySelector`
     * @param {App3DNamespace} appNS Options and namespace used in creating app3D
     *
     * @return {clay.application.App3D}
     *
     * @example
     *  clay.application.create('#app', {
     *      init: function (app) {
     *          app.createCube();
     *          var camera = app.createCamera();
     *          camera.position.set(0, 0, 2);
     *      },
     *      loop: function () { // noop }
     *  })
     */
    create: function (dom, appNS) {
        return new App3D(dom, appNS);
    }
};