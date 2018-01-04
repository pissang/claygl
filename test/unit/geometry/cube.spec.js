require('../../common/');
const assert = require('assert');
const clay = require('../../../dist/claygl');

describe('Cube.Spec', function () {
    it('constructor', function () {
        const geometry = new clay.geometry.Cube({
            widthSegments : 1,
            heightSegments : 2,
            depthSegments : 3
        });
        assert(geometry.widthSegments === 1);
        assert(geometry.heightSegments === 2);
        assert(geometry.depthSegments === 3);
        assert(!geometry.inside);

        assert(!geometry.isUniqueVertex());
        assert(geometry.indices);
    });

    it('#generateFaceNormals', function () {
        const geometry = new clay.geometry.Cube();
        const normal = geometry.attributes.normal.value;
        geometry.generateFaceNormals();
        assert.notDeepEqual(geometry.attributes.normal.value, normal);
    });

    it('#generateTangents', function () {
        const geometry = new clay.geometry.Cube();
        const tangent = geometry.attributes.tangent.value;
        geometry.generateTangents();
        assert.notDeepEqual(geometry.attributes.tangent.value, tangent);
        assert(geometry.attributes.tangent.value.length === 96);
    });

    it('#generateUniqueVertex', function () {
        const geometry = new clay.geometry.Cube();
        assert(!geometry.isUniqueVertex());
        assert(geometry.attributes.normal.value.length === 72);
        assert(geometry.attributes.texcoord0.value.length === 48);
        geometry.generateUniqueVertex();
        assert(geometry.attributes.normal.value.length  === 108);
        assert(geometry.attributes.texcoord0.value.length === 72);
    });

    it('#generateBarycentric', function () {
        const geometry = new clay.geometry.Cube();
        assert(!geometry.attributes.barycentric.value);
        geometry.generateBarycentric();
        assert(geometry.attributes.barycentric.value.length === 108);
    });
});