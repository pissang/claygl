const assert = require('assert');
const { util, helper } = require('./../common/');
const clay = require('../../dist/claygl');

describe('Scene.Spec', function () {
    it('constructor', function () {
        const scene = new clay.Scene();
    });

    it('a clean scene', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        renderer.render(scene, camera);
    });

    it('add/remove a node', function () {
        const nodeName = 'spec';
        const root = new clay.Node({
            name : 'spec'
        });

        const { scene } = helper.createQtekScene();

        scene.addToScene(root);
        let actual = scene.getNode(nodeName);
        assert(actual.name === nodeName);

        scene.removeFromScene(root);
        actual = scene.getNode(nodeName);
        assert(actual === undefined);
    });

    it('clone a node', function () {
        const mesh = new clay.Mesh({
            material: new clay.Material({
                shader: clay.shader.library.get('clay.standard')
            }),
            geometry: new clay.geometry.Cube()
        });

        const { renderer, scene, camera } = helper.createQtekScene();
        //TODO clone of skeleton
        //cloneNode is a part deep clone: geometry won't be cloned but material and skeleton will
        const cloned = scene.cloneNode(mesh);
        assert(cloned instanceof clay.Mesh);
        assert(cloned !== mesh);
        assert(cloned.material instanceof clay.Material);
        assert(cloned.material !== mesh.material);
        assert(cloned.geometry instanceof clay.geometry.Cube);
        //geometry
        assert(cloned.geometry === mesh.geometry);
    });

    it('invoking update shouldn\'t throw any error', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        //scene.update is called in render.render
        const originUpdate = scene.update;
        let called = false;
        scene.update = function (...args) {
            called = true;
            originUpdate.apply(scene, args);
        };
        renderer.render(scene, camera);
        assert(called);
    });

    it('Light uniforms', function () {
        //a little bit complicated case lended from lightgroup.html
        //ensure setShaderLightNumber and setLightUniforms are invoked
        //-------------------------------------------
        const Shader = clay.Shader,
            Material = clay.Material;

        const { renderer, scene, camera } = helper.createQtekScene();

        const cube = new clay.geometry.Cube();

        const material1 = new Material({
            shader: new Shader(Shader.source('clay.standard.vertex'), Shader.source('clay.standard.fragment'))
        });
        const material2 = new Material({
            shader: new Shader(Shader.source('clay.standard.vertex'), Shader.source('clay.standard.fragment'))
        });

        material1.shader.lightGroup = 0;
        material2.shader.lightGroup = 1;

        const root = new clay.Node({
            name : 'ROOT'
        });
        scene.add(root);

        for (let i = 0; i < 2; i++) {
            const mesh = new clay.Mesh({
                geometry: cube,
                material: i % 2 ? material1 : material2
            });
            root.add(mesh);
        }
        //-------------------------------------------

        const light1 = new clay.light.Point({
            range: 200,
            group: 0,
            color: [1, 0.5, 0]
        });
        const light2 = new clay.light.Point({
            range: 200,
            group: 1,
            color: [0, 0.5, 1]
        });
        scene.add(light1);
        scene.add(light2);

        renderer.render(scene, camera);
        const lightGroup0 = scene._lightUniforms[0];
        const lightGroup1 = scene._lightUniforms[1];

        const expected0 = {"pointLightPosition":{"type":"3fv","value":[0,0,0]},"pointLightRange":{"type":"1fv","value":[200]},"pointLightColor":{"type":"3fv","value":[1,0.5,0]}};
        const expected1 = {"pointLightPosition":{"type":"3fv","value":[0,0,0]},"pointLightRange":{"type":"1fv","value":[200]},"pointLightColor":{"type":"3fv","value":[0,0.5,1]}};

        //check light uniforms
        assert.deepEqual(lightGroup0, expected0);
        assert.deepEqual(lightGroup1, expected1);
    });

});