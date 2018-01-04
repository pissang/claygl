
/**
 * Helpers for creating a common 3d application.
 * @namespace clay.application
 */

import Renderer from './Renderer';
import Scene from './Scene';
import Timeline from './animation/Timeline';
import CubeGeo from './geometry/Cube';
import SphereGeo from './geometry/Sphere';
import PlaneGeo from './geometry/Plane';
import CylinderGeo from './geometry/Cylinder';
import Texture2D from './Texture2D';
import Texture from './Texture';
import shaderLibrary from './shader/library';
import Mesh from './Mesh';
import Material from './Material';
import PerspectiveCamera from './camera/Perspective';
import OrthographicCamera from './camera/Orthographic';
import Vector3 from './math/Vector3';

import './shader/builtin';


function App3D(dom, appNS) {

    appNS = appNS || {};

    if (typeof dom === 'string') {
        dom = document.querySelector(dom);
    }

    if (!dom) {
        throw new Error('Invalid dom');
    }

    var isDomCanvas = dom.nodeName.toUpperCase() === 'CANVAS';
    var rendererOpts = {};
    if (isDomCanvas) {
        rendererOpts.canvas = dom;
    }
    if (appNS.devicePixelRatio) {
        rendererOpts.devicePixelRatio = appNS.devicePixelRatio;
    }

    var gRenderer = new Renderer(rendererOpts);
    var gWidth = appNS.width || dom.clientWidth;
    var gHeight = appNS.height || dom.clientHeight;

    if (!isDomCanvas) {
        dom.appendChild(gRenderer.canvas);
    }
    gRenderer.resize(gWidth, gHeight);

    var gScene = new Scene();
    var gTimeline = new Timeline();
    var gFrameTime = 0;
    var gElapsedTime = 0;

    gTimeline.start();

    Object.defineProperties(this, {
        renderer: { get: function () { return gRenderer; }},
        scene: { get: function () { return gScene; }},
        timeline: { get: function () { return gTimeline; }},
        frameTime: { get: function () { return gFrameTime; }},
        elapsedTime: { get: function () { return gElapsedTime; }}
    });

    this.resize = function (width, height) {
        gWidth = width || appNS.width || dom.clientWidth;
        gHeight = height || dom.height || dom.clientHeight;
        gRenderer.resize(gWidth, gHeight);
    };

    this.dispose = function () {
        if (appNS.dispose) {
            appNS.dispose(this);
        }
        gTimeline.stop();
        gRenderer.disposeScene(gScene);
        dom.innerHTML = '';
    };

    appNS.init && appNS.init(this);

    var gTexturesList = {};
    var gGeometriesList = {};

    if (appNS.loop) {
        gTimeline.on('frame', function (frameTime) {
            gFrameTime = frameTime;
            gElapsedTime += frameTime;
            appNS.loop(this);

            this._doRender(gRenderer, gScene);

            // Mark all resources unused;
            markUsed(gTexturesList);
            markUsed(gGeometriesList);

            // Collect resources used in this frame.
            var newTexturesList = [];
            var newGeometriesList = [];
            this._collectResources(newTexturesList, newGeometriesList);

            // Dispose those unsed resources.
            checkAndDispose(this.renderer, gTexturesList);
            checkAndDispose(this.renderer, gGeometriesList);

            gTexturesList = newTexturesList;
            gGeometriesList = newGeometriesList;
        }, this);
    }
}

function isImageLikeElement(val) {
    return val instanceof Image
        || val instanceof HTMLCanvasElement
        || val instanceof HTMLVideoElement;
}

App3D.prototype._doRender = function (renderer, scene) {
    var camera = scene.getMainCamera();
    camera.aspect = renderer.getViewportAspect();
    renderer.render(scene);
};


function markUsed(resourceList) {
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
    list.push(resource);
    resource.__used__ = resource.__used__ || 0;
    resource.__used__++;
}
App3D.prototype._collectResources = function (textureResourceList, geometryResourceList) {

    function trackQueue(queue) {
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            var geometry = renderable.geometry;
            var material = renderable.material;
            updateUsed(geometry, geometryResourceList);

            for (var name in material.uniforms) {
                var val = material.uniforms[name].value;
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
    }

    var scene = this.scene;

    trackQueue(scene.opaqueList);
    trackQueue(scene.transparentList);

    for (var k = 0; k < scene.lights.length; k++) {
        // Track AmbientCubemap
        if (scene.lights[k].cubemap) {
            updateUsed(scene.lights[k].cubemap, textureResourceList);
        }
    }

};

App3D.prototype.loadTexture = function (urlOrImg) {
    // TODO Promise ?
    return new Promise(function (resolve, reject) {
        var texture = new Texture2D();
        if (typeof urlOrImg === 'string') {
            texture.load(urlOrImg);
            texture.success(function () {
                resolve(texture);
            });
            texture.error(function () {
                reject();
            });
        }
        else if (isImageLikeElement(urlOrImg)) {
            texture.image = urlOrImg;
            texture.dynamic = urlOrImg instanceof HTMLVideoElement;
            resolve(texture);
        }
    });
};

App3D.prototype.createMaterial = function (matConfig) {
    matConfig = matConfig || {};
    matConfig.shader = matConfig.shader || 'clay.standard';
    var material = new Material({
        shader: shaderLibrary.get(matConfig.shader)
    });
    function makeTextureSetter(key) {
        return function (texture) {
            material.setUniform(key, texture);
        };
    }
    for (var key in matConfig) {
        if (material.uniforms[key]) {
            var val = matConfig[key];
            if (material.uniforms[key].type === 't'
                && (typeof val === 'string' || isImageLikeElement(val))
            ) {
                // Try to load a texture.
                this.loadTexture(val).then(makeTextureSetter(key));
            }
            else {
                material.setUniform(key, val);
            }
        }
    }
    return material;
};

function makeProceduralMeshCreator(createGeo) {
    return function (size, mat) {
        var mesh = new Mesh({
            geometry: createGeo(size),
            material: this.createMaterial(mat)
        });
        this.scene.add(mesh);
        return mesh;
    };
}

App3D.prototype.createCube = makeProceduralMeshCreator(function (size) {
    if (size == null) {
        size = 1;
    }
    if (typeof size === 'number') {
        size = [size, size, size];
    }
    return new CubeGeo({
        width: size[0],
        height: size[1],
        depth: size[2]
    });
});

App3D.prototype.createSphere = makeProceduralMeshCreator(function (radius) {
    if (radius == null) {
        radius = 1;
    }
    return new SphereGeo({
        radius: radius
    });
});

App3D.prototype.createPlane = makeProceduralMeshCreator(function (size) {
    if (size == null) {
        size = 1;
    }
    if (typeof size === 'number') {
        size = [size, size];
    }
    return new PlaneGeo({
        width: size[0],
        height: size[1]
    });
});

App3D.prototype.createCamera = function (position, target, type) {
    var CameraCtor = (type === 'ortho' || type === 'orthographic')
        ? OrthographicCamera : PerspectiveCamera;

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


export default {
    create: function (dom, appNS) {
        return new App3D(dom, appNS);
    }
};