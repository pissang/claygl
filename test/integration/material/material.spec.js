const clay = require('../../../dist/claygl');
const { util, helper } = require('../../common');
const path = require('path');


function createCube(material) {
    const root = new clay.Node();
    root.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);

    const mesh = new clay.Mesh({
        material: material,
        geometry : new clay.geometry.Cube()
    });
    mesh.scale.set(4, 4, 4);
    root.add(mesh);

    return root;
}

describe('Integration.Material.Spec', function () {
    it('metalness and roughness', function (done) {
        const { renderer, scene, camera, canvas } = helper.createQtekScene();
        const light = new clay.light.Point({
            intensity  : 0.8,
            castShadow : false,
            range: 200
        });
        light.position.set(30, -30, 30);
        light.lookAt(scene.position);
        scene.add(light);
        scene.add(new clay.light.Ambient({
            intensity: 0.2
        }));

        const material = new clay.StandardMaterial({
            metalness: 0.5,
            roughness: 0.5
        });

        const cube = createCube(material);
        scene.add(cube);

        const drawInfo = renderer.render(scene, camera);

        util.assertWith(canvas, { fixture : path.join(__dirname, 'metalness.png') }, done);
    });

    it('maps', function (done) {
        this.timeout(10000);

        const { renderer, scene, camera, canvas } = helper.createQtekScene();
        const light = new clay.light.Point({
            intensity : 0.8,
            castShadow: false,
            range: 200
        })
        light.position.set(30, -30, 30);
        light.lookAt(scene.position);
        scene.add(light);
        scene.add(new clay.light.Ambient({
            intensity: 0.4
        }));


        const promises = [ ['diffuseMap', 'basecolor'], ['normalMap', 'normal'],  ['metalnessMap', 'metalness'], ['roughnessMap', 'roughness']].map(mapInfo => {
            const tex = new clay.Texture2D({
                wrapS: clay.Texture.REPEAT,
                wratT: clay.Texture.REPEAT
            });
            return new Promise((resolve, reject) => {
                const filePath = path.join(__dirname, 'textures', 'material', 'iron-rusted4-' + mapInfo[1] + '.png');
                tex.load(filePath);
                tex.success(() => {
                        resolve({
                            'define' : mapInfo[0],
                            'texture' : tex
                        });
                    });
                tex.error(reject);
            });
        });

        Promise.all(promises).then((textures) => {
            const material = new clay.StandardMaterial({
                linear: true,
                metalness: 0.5,
                roughness: 0.5,
                uvRepeat: [3, 3]
            });
            textures.forEach(t => {
                material[t.define] = t.texture;
            });
            const mesh = new clay.Mesh({
                geometry: new clay.geometry.Cube(),
                material: material
            });
            mesh.scale.set(3, 3, 3);
            // mesh.geometry.generateTangents();
            mesh.rotation.identity().rotateY(30 * Math.PI / 180).rotateX(30 * Math.PI / 180);

            const root = new clay.Node();
            root.add(mesh);
            scene.add(root);
            const drawInfo = renderer.render(scene, camera);
            util.assertWith(canvas, { fixture : path.join(__dirname, 'maps.png'), diffOptions : { diffRatio : 0.1 } }, done);
        });
    });
});