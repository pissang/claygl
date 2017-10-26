const assert = require('assert');
const { util, helper } = require('./common/');
const qtek = require('../dist/qtek');

describe('Scene.Spec', function () {
    it('constructor', function () {
        const scene = new qtek.Scene();
    });

    it('a clean scene', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        renderer.render(scene, camera);
    });

    it('add/remove a node', function () {
        const nodeName = 'spec';
        const root = new qtek.Node({
            name : 'spec'
        });

        const { scene } = helper.createQtekScene();

        scene.addToScene(root);
        let actual = scene.getNode(nodeName);
        assert(actual.name === nodeName);

        scene.removeFromScene(root);
        actual = scene.getNode(nodeName);
        assert(actual === undefined);
    });

    it('clone a node', function () {

    });

    it('#update', function () {

    });

    it('#setShaderLightNumber', function () {

    });

    it('#setLightUniforms', function () {

    });

});