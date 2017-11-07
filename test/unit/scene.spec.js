const assert = require('assert');
const { util, helper } = require('./../common/');
const qtek = require('../../dist/qtek');

describe('Scene.Spec', function () {
    it('constructor', function () {
        const scene = new qtek.Scene();
    });

    it('a clean scene', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        renderer.render(scene, camera);
    });

    it('add/remove a node', function () {
        const nodeName = 'spec';
        const root = new qtek.Node({
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
        const mesh = new qtek.Mesh({
            material: new qtek.Material({
                shader : qtek.shader.library.get('qtek.standard').clone()
            }),
            geometry : new qtek.geometry.Cube()
        });

        const { renderer, scene, camera } = helper.createQtekScene();
        //TODO clone of skeleton
        //cloneNode is a part deep clone: geometry won't be cloned but material and skeleton will
        const cloned = scene.cloneNode(mesh);
        assert(cloned instanceof qtek.Mesh);
        assert(cloned !== mesh);
        assert(cloned.material instanceof qtek.Material);
        assert(cloned.material !== mesh.material);
        assert(cloned.geometry instanceof qtek.geometry.Cube);
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

    it('invoking setShaderLightNumber and setLightUniforms shouldn\'t throw any error', function () {
        //a little bit complicated case lended from lightgroup.html
        //ensure setShaderLightNumber and setLightUniforms are invoked
        //-------------------------------------------
        const Shader = qtek.Shader,
            Material = qtek.Material;

        const { renderer, scene, camera } = helper.createQtekScene();

        const cube = new qtek.geometry.Cube();

        const material1 = new Material({
            shader: new Shader({
                vertex: Shader.source('qtek.standard.vertex'),
                fragment: Shader.source('qtek.standard.fragment')
            })
        });
        const material2 = new Material({
            shader: new Shader({
                vertex: Shader.source('qtek.standard.vertex'),
                fragment: Shader.source('qtek.standard.fragment')
            })
        });

        material1.shader.lightGroup = 0;
        material2.shader.lightGroup = 1;

        const root = new qtek.Node({
            name : 'ROOT'
        });
        scene.add(root);
        
        for (let i = 0; i < 2; i++) {
            const mesh = new qtek.Mesh({
                geometry: cube,
                material: i % 2 ? material1 : material2
            });
            root.add(mesh);
        }
        //-------------------------------------------

        const light1 = new qtek.light.Point({
            range: 200,
            group: 0,
            color: [1, 0.5, 0]
        });
        const light2 = new qtek.light.Point({
            range: 200,
            group: 1,
            color: [0, 0.5, 1]
        });
        scene.add(light1);
        scene.add(light2);

        let called1 = false, called2 = false;

        //check if setShaderLightNumber and setLightUniforms are called
        const originSetShaderLightNumber = scene.setShaderLightNumber;
        scene.setShaderLightNumber = function (...args) {
            called1 = true;
            originSetShaderLightNumber.apply(scene, args);
        };

        const originSetLightUniforms = scene.setLightUniforms;
        scene.setLightUniforms = function (...args) {
            called2 = true;
            originSetLightUniforms.apply(scene, args);
        };

        renderer.render(scene, camera);
        const lightGroup0 = scene._lightUniforms[0];
        const lightGroup1 = scene._lightUniforms[1];

        const expected0 = {"pointLightPosition":{"type":"3fv","value":[0,0,0]},"pointLightRange":{"type":"1fv","value":[200]},"pointLightColor":{"type":"3fv","value":[1,0.5,0]}};
        const expected1 = {"pointLightPosition":{"type":"3fv","value":[0,0,0]},"pointLightRange":{"type":"1fv","value":[200]},"pointLightColor":{"type":"3fv","value":[0,0.5,1]}};

        assert(called1 && called2);

        //check light uniforms
        assert.deepEqual(lightGroup0, expected0);
        assert.deepEqual(lightGroup1, expected1);
    });

});