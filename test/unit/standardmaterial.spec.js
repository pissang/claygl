const assert = require('assert');
const { util, helper } = require('./../common/');
const qtek = require('../../dist/qtek');

describe('StandardMaterial.Spec', function () {
    it('constructor', function () {
        const material = new qtek.StandardMaterial();
    });

    it('append defines in shader source dynamically', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const material = new qtek.StandardMaterial({
            linear: true,
            metalness : 0.5,
            roughness : 0.5,
            encodeRGBM : true,
        });

        material.updateShader(renderer);

        material.bind(renderer, null);

        assert(material.linear === true);
        assert(material.metalness === 0.5);        
        assert(material.roughness === 0.5);
        assert(material.encodeRGBM === true);

        assert(material.shader);
        material.shader.bind(renderer);
        assert(material.shader._fragmentProcessed.indexOf('#define USE_METALNESS') > 0);
        //define added by encodeRGBM options
        assert(material.shader._fragmentProcessed.indexOf('#define RGBM_ENCODE') > 0);
    });

    it('#clone', function () {
        const material = new qtek.StandardMaterial({
            linear: true,
            metalness : 0.5,
            roughness : 0.5,
            encodeRGBM : true,
        });

        material2 = material.clone();

        assert(material2.linear === true);
        assert(material2.metalness === 0.5);        
        assert(material2.roughness === 0.5);
        assert(material2.encodeRGBM === true);
    });
});