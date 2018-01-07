const assert = require('assert');
const clay = require('../../dist/claygl');
const helper = require('../common/helper');

function getBBoxArr(bbox) {
    return [bbox.min.array, bbox.max.array];
}

describe('Scene.Spec', function () {

    it('get bounding box', function () {

        const rootNode = new clay.Node();
        const middleNode = new clay.Node();

        const mesh = new clay.Mesh({
            geometry: new clay.geometry.Cube(),
            material: helper.createBuiltinMaterial()
        });
        rootNode.add(middleNode);
        middleNode.add(mesh);

        rootNode.position.set(1, 1, 1);
        middleNode.position.set(1, 1, 1);

        rootNode.update();

        assert.deepEqual(getBBoxArr(rootNode.getBoundingBox()), [[1, 1, 1], [3, 3, 3]]);
        assert.deepEqual(getBBoxArr(middleNode.getBoundingBox()), [[0, 0, 0], [2, 2, 2]]);
        assert.deepEqual(getBBoxArr(mesh.getBoundingBox()), [[-1, -1, -1], [1, 1, 1]]);
    });
});

