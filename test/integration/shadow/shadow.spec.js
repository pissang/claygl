const clay = require('../../../dist/claygl');
const { util, helper } = require('../../common');
const path = require('path');

function createCube() {
    const root = new clay.Node();
    root.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);

    const mesh = new clay.Mesh({
        material: new clay.Material({
            shader: clay.shader.library.get('clay.standard')
        }),
        geometry: new clay.geometry.Cube()
    });
    root.add(mesh);

    return root;
}

function addCubes(scene) {
    const cube0 = createCube();
    const cube1 = createCube();
    cube1.position.set(1, 0, 3);
    const cube2 = createCube();
    cube2.position.set(3, 0, 6);

    scene.add(cube0);
    scene.add(cube1);
    scene.add(cube2);
}

describe('Integration.shadow.Spec', function () {
    it('directional light shadow', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const shadowMapPass = new clay.prePass.ShadowMap({
            softShadow: clay.prePass.PCF
        });

        const light = new clay.light.Directional({
            intensity: 1,
            castShadow: true,
            shadowBias: 0.001,
            shadowSlopeScale: 2.0,
            shadowCascade: 1,
            cascadeSplitLogFactor: 0.2,
            shadowResolution: 256
        });
        light.position.set(30, 0, 30);
        light.lookAt(scene.position);

        scene.add(light);

        addCubes(scene);

        shadowMapPass.render(renderer, scene, camera);
        renderer.render(scene, camera);

        util.assertWith(canvas, { fixture: path.join(__dirname, 'shadow-directional-pcf.png') }, done);
    });

    it('directional light shadow with VSM', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const shadowMapPass = new clay.prePass.ShadowMap({
            softShadow: clay.prePass.VSM
        });

        const light = new clay.light.Directional({
            intensity: 1,
            castShadow: true,
            shadowBias: 0.001,
            shadowSlopeScale: 2.0,
            shadowCascade: 1,
            cascadeSplitLogFactor: 0.2,
            shadowResolution: 256
        });
        light.position.set(30, 0, 30);
        light.lookAt(scene.position);

        scene.add(light);

        addCubes(scene);

        shadowMapPass.render(renderer, scene, camera);
        renderer.render(scene, camera);

        util.assertWith(canvas, { fixture: path.join(__dirname, 'shadow-directional-vsm.png') }, done);
    });


    it('point light shadow', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const shadowMapPass = new clay.prePass.ShadowMap({
            softShadow: clay.prePass.PCF
        });

        const pointLight = new clay.light.Point({
            castShadow: true,
            shadowResolution: 256,
            intensity: 1,
            range: 200
        });
        pointLight.position.set(30, 0, 15);
        pointLight.lookAt(scene.position);
        scene.add(pointLight);

        addCubes(scene);

        shadowMapPass.render(renderer, scene, camera);
        renderer.render(scene, camera);

        util.assertWith(canvas, { fixture: path.join(__dirname, 'shadow-point-pcf.png') }, done);
    });

    it('point light shadow with VSM', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const shadowMapPass = new clay.prePass.ShadowMap({
            softShadow: clay.prePass.VSM
        });

        const pointLight = new clay.light.Point({
            castShadow: true,
            shadowResolution: 256,
            intensity: 1,
            range: 200
        });
        pointLight.position.set(30, 0, 15);
        pointLight.lookAt(scene.position);
        scene.add(pointLight);

        addCubes(scene);

        shadowMapPass.render(renderer, scene, camera);
        renderer.render(scene, camera);

        util.assertWith(canvas, { fixture: path.join(__dirname, 'shadow-point-vsm.png') }, done);
    });
});


