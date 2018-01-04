// Basic application helper

import Renderer from './Renderer';
import Scene from './Scene';
import Timeline from './animation/Timeline';
import CubeGeo from './geometry/Cube';
import shaderLibrary from './shader/library';
import Mesh from './Mesh';
import Material from './Material';
import './shader/builtin';

function create(dom, opts) {
    opts = opts || {};

    if (typeof dom === 'string') {
        dom = document.querySelector(dom);
    }

    if (!dom) {
        throw new Error('Invalid dom');
    }
    var rendererOpts = {
        canvas: dom
    };
    if (opts.devicePixelRatio) {
        rendererOpts.devicePixelRatio = opts.devicePixelRatio;
    }

    var gRenderer = new Renderer(rendererOpts);
    if (opts.width && opts.height) {
        gRenderer.resize(opts.width, opts.height);
    }

    var gScene = new Scene();
    var gTimeline = new Timeline();
    var gFrameTime = 0;
    var gElapsedTime = 0;

    gTimeline.start();

    var app = {
        get renderer () { return gRenderer; },

        get scene () { return gScene; },

        get timeline() { return gTimeline; },

        get frameTime() { return gFrameTime; },

        get elapsedTime() { return gElapsedTime; },

        dispose: function () {
            if (opts.dispose) {
                opts.dispose.call(app);
            }

            gTimeline.stop();
            gRenderer.disposeScene(gScene);
        }
    };

    opts.init && opts.init.call(app, gRenderer, gScene, gTimeline);

    if (opts.loop) {
        gTimeline.on('frame', function (frameTime) {
            gFrameTime = frameTime;
            gElapsedTime += frameTime;
            opts.loop.call(app, gRenderer, gScene, gTimeline);

            var camera = gScene.getMainCamera();
            camera.aspect = gRenderer.getViewportAspect();
            gRenderer.render(gScene);
        });
    }

    return app;
}

function createCube(size, mat) {
    mat = mat || {};
    mat.shader = mat.shader || 'clay.standard';
    if (size == null) {
        size = 1;
    }
    if (typeof size === 'number') {
        size = [size, size, size];
    }
    return new Mesh({
        geometry: new CubeGeo({
            width: size[0],
            height: size[1],
            depth: size[2]
        }),
        material: new Material({
            shader: shaderLibrary.get(mat.shader)
        })
    });
}


export default {
    create: create,

    createCube: createCube
};