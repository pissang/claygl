require('../../common/');
const assert = require('assert');
const clay = require('../../../dist/claygl');

describe('Plane.Spec', function () {
    it('constructor', function () {
        const geometry = new clay.geometry.Plane({
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
        const geometry = new clay.geometry.Plane();
        const normal = geometry.attributes.normal.value;
        geometry.generateFaceNormals();
        assert.notDeepEqual(geometry.attributes.normal.value, normal);
    });

    it('#generateTangents', function () {
        const geometry = new clay.geometry.Plane();
        const tangent = geometry.attributes.tangent.value;
        geometry.generateTangents();
        assert.notDeepEqual(geometry.attributes.tangent.value, tangent);
        const len = geometry.attributes.tangent.value.length;
        assert(len === 16, 'Plane.tangent : ' + len);
    });

    it('#generateUniqueVertex', function () {
        const geometry = new clay.geometry.Plane();
        assert(!geometry.isUniqueVertex());
        let normals = geometry.attributes.normal.value,
            texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length === 12, 'Plane.normal.count : ' + normals.length);
        assert(texCoords.length === 8, 'Plane.textcoord.count : ' + texCoords.length);
        geometry.generateUniqueVertex();
        normals = geometry.attributes.normal.value;
        texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length  === 18, 'Plane.normal.count : ' + normals.length);
        assert(texCoords.length === 12, 'Plane.textcoord.count : ' + texCoords.length);
    });

    it('#generateBarycentric', function () {
        const geometry = new clay.geometry.Plane();
        assert(!geometry.attributes.barycentric.value);
        geometry.generateBarycentric();
        const attrCount = geometry.attributes.barycentric.value.length;
        assert(attrCount === 18, attrCount);
    });
});