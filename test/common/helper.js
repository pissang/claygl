const util = require('./util');
const qtek = require('../../dist/qtek');

module.exports = {
    /**
     * Helper to create a qtek scene
     * @param {Object} options
     * @param {Object} [options.size=[200, 200]]  canvas size
     * @param {Object} [options.cameraPosition=[0, 0, 20]]
     */
    createQtekScene(options = {}) {
        const size = options.size || [200, 200];
        const canvas = document.createElement('canvas');
        canvas.width = size[0];
        canvas.height = size[1];
        const renderer = new qtek.Renderer({
            canvas : canvas,
            //disable antialias to avoid pixel shift on different OS
            antialias : false
        });
        canvas.gl = renderer.gl;
        renderer.resize(canvas.width, canvas.height);
        const scene = new qtek.Scene();
        const camera = new qtek.camera.Perspective({
            aspect: renderer.getViewportAspect()
        });

        const pos = options.cameraPosition || [0, 0, 20];
        camera.position.set(...pos);

        return {
            canvas, renderer, scene, camera
        };
    }
};
