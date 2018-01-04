const clay = require('../../../dist/claygl');
const { util, helper } = require('../../common');
const path = require('path');

describe('Integration.Anistropic.Spec', function () {
    it('texture anistropic', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene({
            size: [600, 600],
            cameraPosition: [0, 4, 14]
        });
        if (!renderer.getGLExtension('EXT_texture_filter_anisotropic')) {
            done();
            return;
        }
        camera.lookAt(new clay.math.Vector3(0, 1, 0));
        camera.far = 500;

        const texture = clay.util.texture.loadTexture(
            path.join(__dirname, 'textures', 'anistropic', 'ground_tile.jpg'),
            function () {
                texture.wrapS = clay.Texture.REPEAT;
                texture.wrapT = clay.Texture.REPEAT;
                texture.anisotropic = 4;

                const shader = clay.shader.library.get('clay.basic', 'diffuseMap');

                const material = new clay.Material({
                    shader: shader
                });
                material.set("diffuseMap", texture);
                material.set("uvRepeat", [10, 10])

                const root = new clay.Node();
                scene.add(root);

                const plane = new clay.geometry.Plane({
                    widthSegments: 1,
                    heightSegments: 1
                });
                const planeMesh = new clay.Mesh({
                    geometry: plane,
                    material: material,
                    scale: new clay.math.Vector3(30, 30, 30)
                });

                planeMesh.rotation.rotateX(-Math.PI/2);
                root.add(planeMesh);

                const drawInfo = renderer.render(scene, camera);

                util.assertWith(canvas, { fixture: path.join(__dirname, 'anistropic.png') }, done);
            });

    });
});