const qtek = require('../../../dist/qtek');
const { util, helper } = require('../../common');
const path = require('path');

describe('Integration.lights.Spec', function () {
    it('lights', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene(); 

        const light = new qtek.light.Directional({
            intensity: 1
        });
        light.position.set(30, 30, 30);
        light.lookAt(scene.position);
         
        scene.add(light);
        scene.add(new qtek.light.Ambient({
            intensity: 0.3
        }));
        
        // const pointLight = new qtek.light.Point({
        //     color: [0.3, 0.4, 0.5],
        //     range: 40,
        //     intensity: 0.8
        // });
        // pointLight.position.set(30, -30, 30);
        // pointLight.lookAt(scene.position);
        // scene.add(pointLight);

        var root = new qtek.Node();
        root.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);
        scene.add(root);

        const mesh = new qtek.Mesh({
            material: new qtek.Material({
                shader : qtek.shader.library.get('qtek.standard')
            }),
            geometry : new qtek.geometry.Cube()
        });
        // mesh.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);
        root.add(mesh);

        const drawInfo = renderer.render(scene, camera);
        
        util.assertWith(canvas, path.join(__dirname, 'lights.png'), done);
    });
});


