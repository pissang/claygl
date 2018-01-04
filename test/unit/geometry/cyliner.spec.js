require('../../common/');
const assert = require('assert');
const clay = require('../../../dist/claygl');

describe('Cylinder.Spec', function () {
    it('constructor', function () {
        const geometry = new clay.geometry.Cylinder({
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
        const geometry = new clay.geometry.Cylinder();
        const normal = geometry.attributes.normal.value;
        geometry.generateFaceNormals();
        assert.notDeepEqual(geometry.attributes.normal.value, normal);
    });

    it('#generateTangents', function () {
        const geometry = new clay.geometry.Cylinder();
        const tangent = geometry.attributes.tangent.value;
        geometry.generateTangents();
        assert.notDeepEqual(geometry.attributes.tangent.value, tangent);
        const len = geometry.attributes.tangent.value.length;
        assert(len === 808, 'Cylinder.tangent : ' + len);
    });

    it('#generateUniqueVertex', function () {
        const geometry = new clay.geometry.Cylinder();
        assert(!geometry.isUniqueVertex());
        let normals = geometry.attributes.normal.value,
            texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length === 606, 'Cylinder.normal.count : ' + normals.length);
        assert(texCoords.length === 404, 'Cylinder.textcoord.count : ' + texCoords.length);
        geometry.generateUniqueVertex();
        normals = geometry.attributes.normal.value;
        texCoords = geometry.attributes.texcoord0.value;
        assert(normals.length  === 1800, 'Cylinder.normal.count : ' + normals.length);
        assert(texCoords.length === 1200, 'Cylinder.textcoord.count : ' + texCoords.length);
    });

    it('#generateBarycentric', function () {
        const geometry = new clay.geometry.Cylinder();
        assert(!geometry.attributes.barycentric.value);
        geometry.generateBarycentric();
        const attrCount = geometry.attributes.barycentric.value.length;
        assert(attrCount === 1800, attrCount);
    });
});