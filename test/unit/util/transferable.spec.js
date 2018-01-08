const assert = require('assert');
const clay = require('../../../dist/claygl');

function assertUnitCube(object) {
    //basic options
    const data = object.data;
    assert.deepEqual(data.boundingBox, {
        min : [-1, -1, -1],
        max : [1, 1, 1]
    });
    assert(data.dynamic === false);
    assert(data.indices instanceof Uint16Array);
    assert(data.indices.length === 132);

    //attributes
    const attributes = data.attributes;
    const keys = ['position', 'texcoord0', 'normal'];
    assert.deepEqual(keys, Object.keys(attributes));
    keys.forEach(k => {
        assert(attributes[k].value.length > 0);
    });
    
    //buffer length
    const counts = [264, 624, 416, 624];
    object.buffers.forEach((b, idx) => {
        assert(b instanceof ArrayBuffer);
        assert(b.byteLength === counts[idx]);
    });
}

describe('util.transferable.Spec', function () {
    it('#toObject', function () {
        const geometry = new clay.geometry.Cube({
            widthSegments : 1,
            heightSegments : 2,
            depthSegments : 3
        });
        
        const object = clay.util.transferable.toObject(geometry);

        assertUnitCube(object);
        //shallow
        assert(object.data.attributes.position.value !== geometry.getAttribute('position').value);
    });

    it('#toObject with shallow', function () {
        const geometry = new clay.geometry.Cube({
            widthSegments : 1,
            heightSegments : 2,
            depthSegments : 3
        });
        
        const object = clay.util.transferable.toObject(geometry, true);

        assertUnitCube(object);
        //shallow
        assert(object.data.attributes.position.value === geometry.getAttribute('position').value);
    });

    it('#toGeometry', function () {
        const geometry = new clay.geometry.Cube({
            widthSegments : 1,
            heightSegments : 2,
            depthSegments : 3
        });
        
        const object = clay.util.transferable.toObject(geometry, true);
        
        const cube = clay.util.transferable.toGeometry(object);
        assert(cube instanceof clay.Geometry);
        assert(!(cube instanceof clay.geometry.Cube));

        assert(geometry.indices.length === 132);
        assert(geometry.getAttribute('position').value.length === 156);
        assert(geometry.getAttribute('texcoord0').value.length === 104);
        assert(geometry.getAttribute('normal').value.length === 156);
    });
});
