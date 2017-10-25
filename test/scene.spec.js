const { util, helper } = require('./common/');
const qtek = require('../dist/qtek');

describe('Scene.Spec', function () {
    it('constructor', function () {
        const scene = new qtek.Scene();
    });

    it('a clean scene', function () {
        const { canvas, renderer, scene, camera } = helper.createQtekScene();
       
        renderer.render(scene, camera);
    });

});