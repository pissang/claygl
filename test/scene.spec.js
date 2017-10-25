const { createHeadlessCanvas } = require('./common/');
const qtek = require('../dist/qtek');

describe('Scene.Spec', function () {
    it('constructor', function () {
        const scene = new qtek.Scene();
    });

    it('a clean scene', function () {
        const Shader = qtek.Shader;
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const renderer = new qtek.Renderer({
            canvas : canvas
        });

        renderer.resize(canvas.width, canvas.height);
        const scene = new qtek.Scene();
        const camera = new qtek.camera.Perspective({
            aspect: renderer.getViewportAspect()
        });
        camera.position.set(0, 0, 20);

        renderer.render(scene, camera);
    });
});