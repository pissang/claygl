require('../../common/');
const assert = require('assert');
const clay = require('../../../dist/claygl');

describe('Cone.Spec', function () {
    it('constructor', function () {
        const geometry = new clay.geometry.Cone({
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
        const geometry = new clay.geometry.Cone();
        const normal = geometry.attributes.normal.value;
        geometry.generateFaceNormals();
        assert.notDeepEqual(geometry.attributes.normal.value, normal);
    });

    it('#generateTangents', function () {
        const geometry = new clay.geometry.Cone();
        const tangent = geometry.attributes.tangent.value;
        geometry.generateTangents();
        assert.notDeepEqual(geometry.attributes.tangent.value, tangent);
        const len = geometry.attributes.tangent.value.length;
        assert(len === 328, 'Cone.tangent : ' + len);
    });

    it('#generateUniqueVertex', function () {
        const geometry = new clay.geometry.Cone();
        assert(!geometry.isUniqueVertex());
        let normals = geometry.attributes.normal.value,
            texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length === 246, 'Cone.normal.count : ' + normals.length);
        assert(texCoords.length === 164, 'Cone.textcoord.count : ' + texCoords.length);
        geometry.generateUniqueVertex();
        normals = geometry.attributes.normal.value;
        texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length  === 720, 'Cone.normal.count : ' + normals.length);
        assert(texCoords.length === 480, 'Cone.textcoord.count : ' + texCoords.length);
    });

    it('#generateBarycentric', function () {
        const geometry = new clay.geometry.Cone();
        assert(!geometry.attributes.barycentric.value);
        geometry.generateBarycentric();
        const attrCount = geometry.attributes.barycentric.value.length;
        assert(attrCount === 720, attrCount);
    });
});