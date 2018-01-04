const clay = require('../../../dist/claygl');
const { util, helper } = require('../../common');
const path = require('path');

function createCube() {
    const root = new clay.Node();
    root.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);

    const mesh = new clay.Mesh({
        material: new clay.Material({
            shader : clay.shader.library.get('clay.standard')
        }),
        geometry : new clay.geometry.Cube()
    });
    root.add(mesh);

    return root;
}

describe('Integration.lights.Spec', function () {
    it('directional light', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const light = new clay.light.Directional({
            intensity: 1
        });
        light.position.set(30, 30, 30);
        light.lookAt(scene.position);

        scene.add(light);

        const cube = createCube();
        scene.add(cube);

        const drawInfo = renderer.render(scene, camera);

        util.assertWith(canvas, { fixture : path.join(__dirname, 'directional-light.png') }, done);
    });

    it('ambient light', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        scene.add(new clay.light.Ambient({
            intensity: 0.3
        }));

        const cube = createCube();
        scene.add(cube);

        const drawInfo = renderer.render(scene, camera);

        util.assertWith(canvas, { fixture : path.join(__dirname, 'ambient-light.png') }, done);
    });

    it('point light', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const light = new clay.light.Point({
            castShadow: false,
            range: 200
        });
        light.position.set(30, -30, 30);
        light.lookAt(scene.position);

        scene.add(light);

        const cube = createCube();
        scene.add(cube);

        const drawInfo = renderer.render(scene, camera);

        util.assertWith(canvas, { fixture : path.join(__dirname, 'point-light.png') }, done);
    });
});
