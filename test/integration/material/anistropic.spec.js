const qtek = require('../../../dist/qtek');
const { util, helper } = require('../../common');
const path = require('path');

describe('Integration.Anistropic.Spec', function () {
    it('texture anistropic', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene({
            size : [600, 600],
            cameraPosition : [0, 4, 14]
        });
        if (!renderer.getGLExtension('EXT_texture_filter_anisotropic')) {
            done();
        }
        camera.lookAt(new qtek.math.Vector3(0, 1, 0));
        camera.far = 500;

        const texture = qtek.util.texture.loadTexture(
            path.join(__dirname, 'textures', 'ground_tile.jpg'),
            function () {                
                texture.wrapS = qtek.Texture.REPEAT;
                texture.wrapT = qtek.Texture.REPEAT;
                texture.anisotropic = 4;

                const shader = qtek.shader.library.get("qtek.basic", "diffuseMap");
                
                const material = new qtek.Material({
                    shader : shader
                });
                material.set("diffuseMap", texture);
                material.set("uvRepeat", [10, 10])

                const root = new qtek.Node();
                scene.add(root);

                const plane = new qtek.geometry.Plane({
                    widthSegments : 1,
                    heightSegments : 1
                });
                const planeMesh = new qtek.Mesh({
                    geometry : plane,
                    material : material,
                    scale : new qtek.math.Vector3(30, 30, 30)
                });
                
                planeMesh.rotation.rotateX(-Math.PI/2);
                root.add(planeMesh);

                const drawInfo = renderer.render(scene, camera);

                util.assertWith(canvas, { fixture : path.join(__dirname, 'anistropic.png') }, done);
            });
        
    });
});