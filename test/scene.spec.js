const assert = require('assert');
const { util, helper } = require('./common/');
const qtek = require('../dist/qtek');

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
                shader : qtek.shader.library.get('qtek.standard')
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

    it('#update', function () {
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

    it('#setShaderLightNumber and #setLightUniforms', function () {
        //from lightgroup.html
        //-------------------------------------------
        const Shader = qtek.Shader,
            Material = qtek.Material;

        const { renderer, scene, camera } = helper.createQtekScene();

        const cube = new qtek.geometry.Cube();
        cube.generateTangents();

        const diffuse = new qtek.Texture2D;
        diffuse.load("../assets/textures/crate.gif");
        const normal = new qtek.Texture2D;
        normal.load("../assets/textures/normal_map.jpg");
        
        const shader1 = new Shader({
            vertex: Shader.source('qtek.standard.vertex'),
            fragment: Shader.source('qtek.standard.fragment')
        });
        const material1 = new Material({
            shader: shader1
        });
        material1.set('diffuseMap', diffuse);
        material1.set('normalMap', normal);
        const shader2 = new Shader({
            vertex: Shader.source('qtek.standard.vertex'),
            fragment: Shader.source('qtek.standard.fragment')
        });
        const material2 = new Material({
            shader: shader2
        });
        material2.set('diffuseMap', diffuse);
        material2.set('normalMap', normal);
        material1.shader.enableTexture(['diffuseMap', 'normalMap']);
        material2.shader.enableTexture(['diffuseMap', 'normalMap']);

        material1.shader.lightGroup = 0;
        material2.shader.lightGroup = 1;

        const root = new qtek.Node({
            name : 'ROOT'
        });
        scene.add(root);
        
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                for ( let k = 0; k < 5; k++) {
                    const mesh = new qtek.Mesh({
                        geometry: cube,
                        material: i % 2 ? material1 : material2
                    });
                    mesh.position.set(50-Math.random()*100, 50-Math.random()*100, 50-Math.random()*100);
                    root.add(mesh);
                }
            }
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
        scene.add(new qtek.light.Ambient({
            intensity: 0.3
        }));

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
        
        const uniforms1 = shader1.createUniforms();
        const uniforms2 = shader1.createUniforms();

        const enUniforms1 = {};
        for (const p in uniforms1) {
            if (material1.isUniformEnabled(p)) {
                enUniforms1[p] = uniforms1[p];
            }
        }

        const enUniforms2 = {};
        for (const p in uniforms2) {
            if (material2.isUniformEnabled(p)) {
                enUniforms2[p] = uniforms2[p];
            }
        }

        const expected1 = {"uvRepeat":{"type":"2f","value":{"0":1,"1":1}},"uvOffset":{"type":"2f","value":{"0":0,"1":0}},"skinMatricesTexture":{"type":"t","value":null},"normalMap":{"type":"t","value":null},"diffuseMap":{"type":"t","value":null},"specularMap":{"type":"t","value":null},"roughness":{"type":"1f","value":0.5},"roughnessMap":{"type":"t","value":null},"glossiness":{"type":"1f","value":0.5},"glossinessMap":{"type":"t","value":null},"metalnessMap":{"type":"t","value":null},"environmentMap":{"type":"t","value":null},"environmentBoxMin":{"type":"3f","value":[0,0,0]},"environmentBoxMax":{"type":"3f","value":[0,0,0]},"brdfLookup":{"type":"t","value":null},"emissiveMap":{"type":"t","value":null},"ssaoMap":{"type":"t","value":null},"aoMap":{"type":"t","value":null},"aoIntensity":{"type":"1f","value":0},"color":{"type":"3f","value":{"0":1,"1":1,"2":1}},"alpha":{"type":"1f","value":1},"alphaCutoff":{"type":"1f","value":0.9},"metalness":{"type":"1f","value":0},"specularColor":{"type":"3f","value":{"0":0.10000000149011612,"1":0.10000000149011612,"2":0.10000000149011612}},"emission":{"type":"3f","value":{"0":0,"1":0,"2":0}},"emissionIntensity":{"type":"1f","value":1},"lineWidth":{"type":"1f","value":0},"lineColor":{"type":"3f","value":{"0":0,"1":0,"2":0}},"maxMipmapLevel":{"type":"1f","value":5},"attenuationFactor":{"type":"1f","value":5},"spotLightShadowMaps":{"type":"tv","value":[]},"spotLightMatrices":{"type":"m4v","value":[]},"spotLightShadowMapSizes":{"type":"1fv","value":[]},"directionalLightShadowMaps":{"type":"tv","value":[]},"directionalLightMatrices":{"type":"m4v","value":[]},"directionalLightShadowMapSizes":{"type":"1fv","value":[]},"shadowCascadeClipsNear":{"type":"1fv","value":[]},"shadowCascadeClipsFar":{"type":"1fv","value":[]},"pointLightShadowMaps":{"type":"tv","value":[]},"pointLightShadowMapSizes":{"type":"1fv","value":[]},"shadowEnabled":{"type":"1i","value":true},"pcfKernel":{"type":"2fv","value":[]}};
        const expected2 = {"uvRepeat":{"type":"2f","value":{"0":1,"1":1}},"uvOffset":{"type":"2f","value":{"0":0,"1":0}},"skinMatricesTexture":{"type":"t","value":null},"normalMap":{"type":"t","value":null},"diffuseMap":{"type":"t","value":null},"specularMap":{"type":"t","value":null},"roughness":{"type":"1f","value":0.5},"roughnessMap":{"type":"t","value":null},"glossiness":{"type":"1f","value":0.5},"glossinessMap":{"type":"t","value":null},"metalnessMap":{"type":"t","value":null},"environmentMap":{"type":"t","value":null},"environmentBoxMin":{"type":"3f","value":[0,0,0]},"environmentBoxMax":{"type":"3f","value":[0,0,0]},"brdfLookup":{"type":"t","value":null},"emissiveMap":{"type":"t","value":null},"ssaoMap":{"type":"t","value":null},"aoMap":{"type":"t","value":null},"aoIntensity":{"type":"1f","value":0},"color":{"type":"3f","value":{"0":1,"1":1,"2":1}},"alpha":{"type":"1f","value":1},"alphaCutoff":{"type":"1f","value":0.9},"metalness":{"type":"1f","value":0},"specularColor":{"type":"3f","value":{"0":0.10000000149011612,"1":0.10000000149011612,"2":0.10000000149011612}},"emission":{"type":"3f","value":{"0":0,"1":0,"2":0}},"emissionIntensity":{"type":"1f","value":1},"lineWidth":{"type":"1f","value":0},"lineColor":{"type":"3f","value":{"0":0,"1":0,"2":0}},"maxMipmapLevel":{"type":"1f","value":5},"attenuationFactor":{"type":"1f","value":5},"spotLightShadowMaps":{"type":"tv","value":[]},"spotLightMatrices":{"type":"m4v","value":[]},"spotLightShadowMapSizes":{"type":"1fv","value":[]},"directionalLightShadowMaps":{"type":"tv","value":[]},"directionalLightMatrices":{"type":"m4v","value":[]},"directionalLightShadowMapSizes":{"type":"1fv","value":[]},"shadowCascadeClipsNear":{"type":"1fv","value":[]},"shadowCascadeClipsFar":{"type":"1fv","value":[]},"pointLightShadowMaps":{"type":"tv","value":[]},"pointLightShadowMapSizes":{"type":"1fv","value":[]},"shadowEnabled":{"type":"1i","value":true},"pcfKernel":{"type":"2fv","value":[]}};                       

        assert(called1 && called2);

        assert.deepEqual(enUniforms1, expected1);
        assert.deepEqual(enUniforms2, expected2);
    });

});