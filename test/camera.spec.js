require('./common/');
const assert = require('assert');
const qtek = require('../dist/qtek');

describe('Camera.Spec', function () {
    it('constructor', function () {
        const camera = new qtek.Camera();
    });

    it('#update', function () {
        const camera = new qtek.camera.Perspective({
            aspect: 4 / 3
        });
        camera.position.set(0, 0, 20);

        camera.update(true);
        
        assert.deepEqual(camera.viewMatrix.toArray(), [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -20, 1 ]);
        assert.deepEqual(camera.worldTransform.toArray(), [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 20, 1 ]);        

        assert.deepEqual(camera.projectionMatrix.toArray(), [ 
            1.6083801984786987,
            0,
            0,
            0,
            0,
            2.1445069313049316,
            0,
            0,
            0,
            0,
            -1.000100016593933,
            -1,
            0,
            0,
            -0.2000100016593933,
            0 ]);
        assert.deepEqual(camera.invProjectionMatrix.toArray(), [ 
            0.6217435598373413,
            -0,
            -0,
            -0,
            -0,
            0.466307669878006,
            0,
            -0,
            -0,
            -0,
            -0,
            -4.999750137329102,
            -0,
            -0,
            -1,
            5.000249862670898 ]);

        assert(camera.frustum);
    });

    it('#setViewMatrix', function () {
        const Matrix4 = qtek.math.Matrix4;

        const m = new Matrix4();
        m.identity(m);
        m.rotateX(30 * Math.PI / 180);
        m.rotateY(60 * Math.PI / 180);

        const camera = new qtek.Camera();
        camera.setViewMatrix(m);

        assert.deepEqual(camera.viewMatrix.toArray(), m.toArray());
        assert.deepEqual(camera.worldTransform.toArray(), Matrix4.invert(new Matrix4(), m).toArray());
    });

    it('#setProjectionMatrix', function () {
        const Matrix4 = qtek.math.Matrix4;
        
        const m = new Matrix4();
        m.identity(m);
        m.rotateX(30 * Math.PI / 180);
        m.rotateY(60 * Math.PI / 180);

        const camera = new qtek.Camera();
        camera.setProjectionMatrix(m);

        assert.deepEqual(camera.projectionMatrix.toArray(), m.toArray());
        assert.deepEqual(camera.invProjectionMatrix.toArray(), Matrix4.invert(new Matrix4(), m).toArray());
    });

    it('#updateProjectionMatrix', function () {
        //TODO it does nothing now
    });

    it('#castRay', function () {
        const camera = new qtek.camera.Perspective({
            aspect: 4 / 3
        });
        camera.position.set(0, 0, 20);

        const ray = camera.castRay(new qtek.math.Vector2(100, 100), new qtek.math.Ray());
        assert.deepEqual(ray.direction.toArray(), [ 0.7999337911605835, 0.59995037317276, -0.012865976430475712 ]);
        assert.deepEqual(ray.origin.toArray(), [ 6.217435359954834, 4.663076877593994, -0.10000000149011612 ]);
    });
});