const util = require('./util');
const clay = require('../../dist/claygl');

module.exports = {
    /**
     * Helper to create a clay scene
     * @param {Object} options
     * @param {Object} [options.size=[200, 200]]  canvas size
     * @param {Object} [options.cameraPosition=[0, 0, 20]]
     */
    createQtekScene(options = {}) {
        const size = options.size || [200, 200];
        const canvas = document.createElement('canvas');
        canvas.width = size[0];
        canvas.height = size[1];
        const renderer = new clay.Renderer({
            canvas : canvas,
            devicePixelRatio: 1,
            //disable antialias to avoid pixel shift on different OS
            antialias : false
        });
        canvas.gl = renderer.gl;
        renderer.resize(canvas.width, canvas.height);
        const scene = new clay.Scene();
        const camera = new clay.camera.Perspective({
            aspect: renderer.getViewportAspect()
        });

        const pos = options.cameraPosition || [0, 0, 20];
        camera.position.set(...pos);

        return {
            canvas, renderer, scene, camera
        };
    },

    createBuiltinMaterial(shaderName) {
        return new clay.Material({
            shader: new clay.Shader({
                vertex: clay.Shader.source(`clay.${shaderName}.vertex`),
                fragment: clay.Shader.source(`clay.${shaderName}.fragment`)
            })
        });
    }
};
