require('./../common/');
const assert = require('assert');
const clay = require('../../dist/claygl');

describe('Camera.Spec', function () {
    it('constructor', function () {
        const camera = new clay.Camera();
    });

    it('#update', function () {
        const camera = new clay.camera.Perspective({
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
        const Matrix4 = clay.math.Matrix4;

        const m = new Matrix4();
        m.identity(m);
        m.rotateX(30 * Math.PI / 180);
        m.rotateY(60 * Math.PI / 180);

        const camera = new clay.Camera();
        camera.setViewMatrix(m);

        assert.deepEqual(camera.viewMatrix.toArray(), m.toArray());
        assert.deepEqual(camera.worldTransform.toArray(), Matrix4.invert(new Matrix4(), m).toArray());
    });

    it('#setProjectionMatrix', function () {
        const Matrix4 = clay.math.Matrix4;

        const m = new Matrix4();
        m.identity(m);
        m.rotateX(30 * Math.PI / 180);
        m.rotateY(60 * Math.PI / 180);

        const camera = new clay.Camera();
        camera.setProjectionMatrix(m);

        assert.deepEqual(camera.projectionMatrix.toArray(), m.toArray());
        assert.deepEqual(camera.invProjectionMatrix.toArray(), Matrix4.invert(new Matrix4(), m).toArray());
    });

    it('#updateProjectionMatrix', function () {
        //TODO it does nothing now
    });

    it('#castRay', function () {
        const camera = new clay.camera.Perspective({
            aspect: 4 / 3
        });
        camera.position.set(0, 0, 20);

        const ray = camera.castRay(new clay.math.Vector2(100, 100), new clay.math.Ray());
        assert.deepEqual(ray.direction.toArray(), [ 0.7999337911605835, 0.59995037317276, -0.012865976430475712 ]);
        assert.deepEqual(ray.origin.toArray(), [ 6.217435359954834, 4.663076877593994, -0.10000000149011612 ]);
    });

    it('Orthographic Camera', function () {
        const camera = new clay.camera.Orthographic({
            left : -2,
            right : 3,
            top : 4,
            bottom : -5,
            near : -2,
            far : 2
        });

        camera.position.set(0, 0, 20);
        camera.updateProjectionMatrix();
        assert.deepEqual(camera.projectionMatrix.toArray(), [ 0.4000000059604645,
            0,
            0,
            0,
            0,
            0.2222222238779068,
            0,
            0,
            0,
            0,
            -0.5,
            0,
            -0.20000000298023224,
            0.1111111119389534,
            -0,
            1 ]);

        const c2 = camera.clone();
        assert(c2.left === -2);
        assert(c2.right === 3);
        assert(c2.top === 4);
        assert(c2.bottom === -5);
        assert(c2.near === -2);
        assert(c2.far === 2);

        camera.decomposeProjectionMatrix();
        assert(closeTo(camera.left, -2));
        assert(closeTo(camera.right, 3));
        assert(closeTo(camera.top, 4));
        assert(closeTo(camera.bottom, -5));
        assert(closeTo(camera.near, -2));
        assert(closeTo(camera.far, 2));
    });

    it('Perspective Camera', function () {
        const camera = new clay.camera.Perspective({
            fov : 60,
            aspect : 1,
            near : 1,
            far : 8000
        });

        camera.position.set(0, 0, 20);
        camera.updateProjectionMatrix();
        assert.deepEqual(camera.projectionMatrix.toArray(), [ 1.7320507764816284,
            0,
            0,
            0,
            0,
            1.7320507764816284,
            0,
            0,
            0,
            0,
            -1.000249981880188,
            -1,
            0,
            0,
            -2.0002501010894775,
            0 ]);

        const c2 = camera.clone();
        assert(c2.fov === 60);
        assert(c2.aspect === 1);
        assert(c2.near === 1);
        assert(c2.far === 8000);

        camera.decomposeProjectionMatrix();
        assert(closeTo(camera.fov, 60));
        assert(closeTo(camera.aspect, 1));
        assert(closeTo(camera.near, 1));
        assert(Math.round(camera.far) === 8002, camera.far);
    });
});

function closeTo(d1, d2, delta) {
    delta = delta || 1E-6;
    const d = d1 - d2;
    return d >= -delta && d <= delta;
}