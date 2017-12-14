const qtek = require('../../../dist/qtek');
const { util, helper } = require('../../common');
const path = require('path');

function createCube(shader) {
    shader = shader || qtek.shader.library.get('qtek.standard').clone();
    const root = new qtek.Node();
    root.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);

    const mesh = new qtek.Mesh({
        material: new qtek.Material({
            shader : shader
        }),
        geometry : new qtek.geometry.Cube()
    });
    root.add(mesh);

    return root;
}

describe('Integration.AmbientCubeMap.Spec', function () {
    it('ambient cube map light', function (done) {
        this.timeout(10000);
        const { renderer, scene, camera, canvas } = helper.createQtekScene();

        const cubemap = qtek.util.texture.loadTexture(
            path.join(__dirname, 'hdr', 'pisa.hdr'),
            {
                exposure: 3
            },
            function () {
                cubemap.flipY = false;
                const ambientCubemapLight = new qtek.light.AmbientCubemap({
                    cubemap: cubemap
                });
                ambientCubemapLight.prefilter(renderer);
                scene.add(ambientCubemapLight);

                const cube = createCube();
                scene.add(cube);

                const drawInfo = renderer.render(scene, camera);

                util.assertWith(canvas, { fixture : path.join(__dirname, 'ambient-cube-map-light.png') }, done);
            });
    });
});