
/**
 * Helpers for creating a common 3d application.
 * @namespace clay.application
 */

 // TODO createCompositor
 // TODO mobile. scroll events.
 // TODO Dispose test. geoCache test.
 // TODO fitModel, normal generation.
 // TODO Skybox, Skydome.
 // TODO Particle ?
import Renderer from './Renderer';
import Scene from './Scene';
import Timeline from './animation/Timeline';
import CubeGeo from './geometry/Cube';
import SphereGeo from './geometry/Sphere';
import PlaneGeo from './geometry/Plane';
import Texture2D from './Texture2D';
import Texture from './Texture';
import shaderLibrary from './shader/library';
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

import colorUtil from './core/color';
var parseColor = colorUtil.parseToFloat;

import './shader/builtin';
import Shader from './Shader';

/**
 * @typedef {string|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} ImageLike
 */
/**
 * @typedef {string|Array.<number>} Color
 */
/**
 * @typedef {HTMLDomElement|string} DomQuery
 */

/**
 * @constructor
 * @alias clay.application.App3D
 * @param {DomQuery} dom Container dom element or a selector string that can be used in `querySelector`
 * @param {Object} appNS
 * @param {Function} appNS.init Initialization callback that will be called when initing app.
 *                      You can return a promise in init to start the loop asynchronously when the promise is resolved.
 * @param {Function} appNS.loop Loop callback that will be called each frame.
 * @param {Function} appNS.beforeRender
 * @param {Function} appNS.afterRender
 * @param {number} [appNS.width] Container width.
 * @param {number} [appNS.height] Container height.
 * @param {number} [appNS.devicePixelRatio]
 * @param {Object} [appNS.graphic] Graphic configuration including shadow, postEffect
 * @param {boolean} [appNS.graphic.shadow=false] If enable shadow
 * @param {boolean} [appNS.graphic.linear=false] If use linear space
 * @param {boolean} [appNS.graphic.tonemapping=false] If enable ACES tone mapping.
 * @param {boolean} [appNS.event=false] If enable mouse/touch event. It will slow down the system if geometries are complex.
 */
function App3D(dom, appNS) {

    appNS = appNS || {};
    appNS.graphic = appNS.graphic || {};

    if (typeof dom === 'string') {
        dom = document.querySelector(dom);
    }

    if (!dom) { throw new Error('Invalid dom'); }

    var isDomCanvas = dom.nodeName.toUpperCase() === 'CANVAS';
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

    Object.defineProperties(this, {
        /**
         * Container dom element
         * @name clay.application.App3D#container
         * @type {HTMLDomElement}
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
        elapsedTime: { get: function () { return gElapsedTime; }}
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
        ['click', 'dblclick', 'mouseover', 'mouseout', 'mousemove'].forEach(function (eveType) {
            this[makeHandlerName(eveType)] && dom.removeEventListener(makeHandlerName(eveType));
        });
    };

    gRayPicking && this._initMouseEvents(gRayPicking);

    this._geoCache = new LRUCache(20);
    this._texCache = new LRUCache(20);

    // Do init the application.
    var initPromise = Promise.resolve(appNS.init && appNS.init(this));
    // Use the inited camera.
    gRayPicking && (gRayPicking.camera = gScene.getMainCamera());

    var gTexturesList = {};
    var gGeometriesList = {};

    if (!appNS.loop) {
        console.warn('Miss loop method.');
    }

    var self = this;
    initPromise.then(function () {
        appNS.loop && gTimeline.on('frame', function (frameTime) {
            gFrameTime = frameTime;
            gElapsedTime += frameTime;
            appNS.loop(self);

            gScene.update();
            self._updateGraphicOptions(appNS.graphic, gScene.opaqueList);
            self._updateGraphicOptions(appNS.graphic, gScene.transparentList);

            gRayPicking && (gRayPicking.camera = gScene.getMainCamera());
            // Render shadow pass
            gShadowPass && gShadowPass.render(gRenderer, gScene, null, true);

            appNS.beforeRender && appNS.beforeRender(self);
            self._doRender(gRenderer, gScene, true);
            appNS.afterRender && appNS.afterRender(self);

            // Mark all resources unused;
            markUnused(gTexturesList);
            markUnused(gGeometriesList);

            // Collect resources used in this frame.
            var newTexturesList = [];
            var newGeometriesList = [];
            collectResources(gScene, newTexturesList, newGeometriesList);

            // Dispose those unsed resources.
            checkAndDispose(gRenderer, gTexturesList);
            checkAndDispose(gRenderer, gGeometriesList);

            gTexturesList = newTexturesList;
            gGeometriesList = newGeometriesList;
        });
    });
}

function isImageLikeElement(val) {
    return val instanceof Image
        || val instanceof HTMLCanvasElement
        || val instanceof HTMLVideoElement;
}

function getKeyFromImageLike(val) {
    typeof val === 'string'
        ? val : (val.__key__ || (val.__key__ = util.genGUID()));
}

function makeHandlerName(eveType) {
    return '_' + eveType + 'Handler';
}

function packageEvent(eventType, pickResult, offsetX, offsetY) {
    var event = util.clone(pickResult);
    event.type = eventType;
    event.offsetX = offsetX;
    event.offsetY = offsetY;
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
    ['click', 'dblclick', 'mouseover', 'mouseout', 'mousemove'].forEach(function (eveType) {
        dom.addEventListener(eveType, this[makeHandlerName(eveType)] = function (e) {
            if (!rayPicking.camera) { // Not have camera yet.
                return;
            }

            var box = dom.getBoundingClientRect();
            var offsetX = e.clientX - box.left;
            var offsetY = e.clientY - box.top;

            var pickResult = rayPicking.pick(offsetX, offsetY);

            if (pickResult) {
                // Just ignore silent element.
                if (pickResult.target.silent) {
                    return;
                }

                if (eveType === 'mousemove') {
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
                    bubblingEvent(pickResult.target, packageEvent(eveType, pickResult, offsetX, offsetY));
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

App3D.prototype._updateGraphicOptions = function (graphicOpts, list) {
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
            mat.define('fragment', 'SRGB_ENCODE');
            mat.define('fragment', 'SRGB_DECODE');
        }
        else {
            mat.undefine('fragment', 'SRGB_ENCODE');
            mat.undefine('fragment', 'SRGB_DECODE');
        }

        prevMaterial = mat;
    }
};

App3D.prototype._doRender = function (renderer, scene) {
    var camera = scene.getMainCamera();
    camera.aspect = renderer.getViewportAspect();
    renderer.render(scene);
};


function markUnused(resourceList) {
    for (var i = 0; i < resourceList.length; i++) {
        resourceList[i].__used__ = 0;
    }
}

function checkAndDispose(renderer, resourceList) {
    for (var i = 0; i < resourceList.length; i++) {
        if (!resourceList[i].__used__) {
            resourceList[i].dispose(renderer);
        }
    }
}

function updateUsed(resource, list) {
    resource.__used__ = resource.__used__ || 0;
    resource.__used__++;
    if (resource.__used__ === 1) {
        // Don't push to the list twice.
        list.push(resource);
    }
}
function collectResources(scene, textureResourceList, geometryResourceList) {
    function trackQueue(queue) {
        var prevMaterial;
        var prevGeometry;
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            var geometry = renderable.geometry;
            var material = renderable.material;

            // TODO optimize!!
            if (material !== prevMaterial) {
                var textureUniforms = material.getTextureUniforms();
                for (var u = 0; u < textureUniforms.length; u++) {
                    var uniformName = textureUniforms[u];
                    var val = material.uniforms[uniformName].value;
                    if (!val) {
                        continue;
                    }
                    if (val instanceof Texture) {
                        updateUsed(val, textureResourceList);
                    }
                    else if (val instanceof Array) {
                        for (var k = 0; k < val.length; k++) {
                            if (val[k] instanceof Texture) {
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
    }

    trackQueue(scene.opaqueList);
    trackQueue(scene.transparentList);

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
 * @param {number} [opts.anisotropic] Anisotropic filtering. See {@link clay.Texture.anisotropic}
 * @param {number} [opts.wrapS=clay.Texture.REPEAT] See {@link clay.Texture.wrapS}
 * @param {number} [opts.wrapT=clay.Texture.REPEAT] See {@link clay.Texture.wrapT}
 * @param {number} [opts.minFilter=clay.Texture.LINEAR_MIPMAP_LINEAR] See {@link clay.Texture.minFilter}
 * @param {number} [opts.magFilter=clay.Texture.LINEAR] See {@link clay.Texture.magFilter}
 * @param {number} [opts.exposure] Only be used when source is a HDR image.
 * @return {Promise}
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
 * Create a material.
 * @param {Object} materialConfig. materialConfig contains `shader`, `transparent` and uniforms that used in corresponding uniforms.
 *                                 Uniforms can be `color`, `alpha` `diffuseMap` etc.
 * @param {string|clay.Shader} [shader='clay.standardMR'] Default to be standard shader with metalness and roughness workflow.
 * @param {boolean} [transparent=false] If material is transparent.
 * @return {clay.Material}
 */
App3D.prototype.createMaterial = function (matConfig) {
    matConfig = matConfig || {};
    matConfig.shader = matConfig.shader || 'clay.standardMR';
    var shader = matConfig.shader instanceof Shader ? matConfig.shader : shaderLibrary.get(matConfig.shader);
    var material = new Material({
        shader: shader
    });
    function makeTextureSetter(key) {
        return function (texture) {
            material.setUniform(key, texture);
        };
    }
    for (var key in matConfig) {
        if (material.uniforms[key]) {
            var val = matConfig[key];
            if (material.uniforms[key].type === 't' || isImageLikeElement(val)) {
                // Try to load a texture.
                this.loadTexture(val).then(makeTextureSetter(key));
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
    return material;
};

/**
 * Create a cube mesh and add it to the scene or the given parent node.
 * @function
 * @param {Array.<number>|number} [subdivision=1] Subdivision of cube.
 *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @return {clay.Mesh}
 * @example
 *  // Create a white cube.
 *  app.createCube()
 */
App3D.prototype.createCube = function (subdiv, material, parentNode) {
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
        this._geoCache.put(geoKey, cube);
    }
    return this.createMesh(cube, material, parentNode);
};

/**
 * Create a cube mesh that camera is inside the cube.
 * @function
 * @param {Array.<number>|number} [subdivision=1] Subdivision of cube.
 *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @return {clay.Mesh}
 * @example
 *  // Create a white cube inside.
 *  app.createCubeInside()
 */
App3D.prototype.createCubeInside = function (subdiv, material, parentNode) {
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
        this._geoCache.put(geoKey, cube);
    }

    return this.createMesh(cube, material, parentNode);
};

/**
 * Create a sphere mesh and add it to the scene or the given parent node.
 * @function
 * @param {number} [subdivision=20] Subdivision of sphere.
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @return {clay.Mesh}
 * @example
 *  // Create a semi-transparent sphere.
 *  app.createSphere(20, {
 *      color: [0, 0, 1],
 *      transparent: true,
 *      alpha: 0.5
 *  })
 */
App3D.prototype.createSphere = function (subdivision, material, parentNode) {
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
        this._geoCache.put(geoKey, sphere);
    }
    return this.createMesh(sphere, material, parentNode);
};

/**
 * Create a plane mesh and add it to the scene or the given parent node.
 * @function
 * @param {Array.<number>|number} [subdivision=1] Subdivision of plane.
 *          Can be a number to represent both width and height dimensions. Or an array to represent them respectively.
 * @param {Object|clay.Material} [material]
 * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
 * @return {clay.Mesh}
 * @example
 *  // Create a red color plane.
 *  app.createPlane(1, {
 *      color: [1, 0, 0]
 *  })
 */
App3D.prototype.createPlane = function (subdiv, material, parentNode) {
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
        this._geoCache.put(geoKey, planeGeo);
    }
    return this.createMesh(planeGeo, material, parentNode);
};

/**
 * Create a general mesh with given geometry instance and material config.
 * @param {*} geometry
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
 * Create a perspective or orthographic camera and add it to the scene.
 * @param {Array.<number>|clay.math.Vector3} position
 * @param {Array.<number>|clay.math.Vector3} target
 * @param {string} [type="perspective"] Can be 'perspective' or 'orthographic'(in short 'ortho')
 * @return {clay.camera.Perspective}
 */
App3D.prototype.createCamera = function (position, target, type) {
    var CameraCtor;
    if (type === 'ortho' || type === 'orthographic') {
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

    this.scene.add(camera);

    return camera;
};

/**
 * Create a directional light and add it to the scene.
 * @param {Array.<number>|clay.math.Vector3} dir A Vector3 or array to represent the direction.
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
 * @param {Array.<number>|clay.math.Vector3} position Position of the spot light.
 * @param {Array.<number>|clay.math.Vector3} [target] Target position where spot light points to.
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
 * @param {Array.<number>|clay.math.Vector3} position Position of point light..
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
 * @param {ImageLike} [envImage] Panorama environment image, HDR format is better.
 * @param {number} [specularIntenstity=0.7] Intensity of specular light.
 * @param {number} [diffuseIntenstity=0.7] Intensity of diffuse light.
 * @param {number} [exposure=1] Exposure of HDR image. Only if image in first paramter is HDR.
 * @param {number} [prefilteredCubemapSize=32] The size of prefilerted cubemap. Larger value will take more time to do expensive prefiltering.
 */
App3D.prototype.createAmbientCubemapLight = function (envImage, specIntensity, diffIntensity, exposure, prefilteredCubemapSize) {
    var self = this;
    if (exposure == null) {
        exposure = 1;
    }
    if (prefilteredCubemapSize == null) {
        prefilteredCubemapSize = 32;
    }

    var scene = this.scene;

    return this.loadTexture(envImage, {
        exposure: exposure
    }).then(function (envTexture) {
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
 * @param {string} [opts.textureRootPath] Root path of texture. Default to be relative with glTF file.
 * @return {Promise}
 */
App3D.prototype.loadModel = function (url, opts) {
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
        textureFlipY: opts.textureFlipY
    };
    if (opts.upAxis && opts.upAxis.toLowerCase() === 'z') {
        loaderOpts.rootNode.rotation.identity().rotateX(-Math.PI / 2);
    }

    var loader = new GLTFLoader(loaderOpts);

    var scene = this.scene;
    var timeline = this.timeline;
    var self = this;

    return new Promise(function (resolve, reject) {
        function afterLoad(result) {
            if (self._disposed) {
                return;
            }

            scene.add(result.rootNode);
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


export default {
    App3D: App3D,
    /**
     * Create a 3D application that will manage the app initialization and loop.
     * @name clay.application.create
     * @param {HTMLDomElement|string} dom Container dom element or a selector string that can be used in `querySelector`
     * @param {Object} appNS
     * @param {Function} init Initialization callback that will be called when initing app.
     * @param {Function} loop Loop callback that will be called each frame.
     * @param {number} [width] Container width.
     * @param {number} [height] Container height.
     * @param {number} [devicePixelRatio]
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