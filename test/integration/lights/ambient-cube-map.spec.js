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

    it.skip('global shader shouldn\'t gets dirty by scene\'s light', function (done) {
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

                const cube = createCube(qtek.shader.library.get('qtek.standard'));
                scene.add(cube);
        
                renderer.render(scene, camera);
                //---------------scene 2 ---------------------
                const ctx = helper.createQtekScene();
                const renderer2 = ctx.renderer,
                    scene2 = ctx.scene,
                    camera2 = ctx.camera,
                    canvas2 = ctx.canvas;
                scene2.add(new qtek.light.Ambient({
                    intensity: 0.3
                }));                
                scene2.add(createCube(qtek.shader.library.get('qtek.standard')));
                const drawInfo = renderer2.render(scene2, camera2);
                util.assertWith(canvas2, { fixture : path.join(__dirname, 'ambient-light.png') }, done);
            });
    });
});