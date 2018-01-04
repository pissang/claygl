const assert = require('assert');
const { util, helper } = require('./../common/');
const clay = require('../../dist/claygl');

describe('StandardMaterial.Spec', function () {
    it('constructor', function () {
        const material = new clay.StandardMaterial();
    });

    it('append defines in shader source dynamically', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const material = new clay.StandardMaterial({
            linear: true,
            metalness : 0.5,
            roughness : 0.5,
            encodeRGBM : true,
        });

        assert(material.linear === true);
        assert(material.metalness === 0.5);
        assert(material.roughness === 0.5);
        assert(material.encodeRGBM === true);
        assert(material.shader);
    });

    it('#clone', function () {
        const material = new clay.StandardMaterial({
            linear: true,
            metalness : 0.5,
            roughness : 0.5,
            encodeRGBM : true,
        });

        const material2 = material.clone();

        assert(material2.linear === true);
        assert(material2.metalness === 0.5);
        assert(material2.roughness === 0.5);
        assert(material2.encodeRGBM === true);
    });
});