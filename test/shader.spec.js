const assert = require('assert');
const { util, helper } = require('./common/');
const qtek = require('../dist/qtek');

//from webglfundamentals
const vertexCode = `
    attribute vec2 position : POSITION;
    attribute vec2 texCoord : TEXCOORD;

    uniform vec2 u_resolution;

    varying vec2 v_texCoord;

    void main() {
    // convert the rectangle from pixels to 0.0 to 1.0
    vec2 zeroToOne = position / u_resolution;

    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    // pass the texCoord to the fragment shader
    // The GPU will interpolate this value between points.
    v_texCoord = texCoord;
    }
    `;

const fragmentCode =  `
    precision mediump float;

    // our texture
    uniform sampler2D u_image;

    // the texCoords passed in from the vertex shader.
    varying vec2 v_texCoord;

    void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
    }
    `;

describe('Shader.Spec', function () {
    it('constructor', function () {
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        }); 

        assert(shader.attribSemantics['POSITION']);
        assert(shader.attribSemantics['TEXCOORD']);
    });

    it('#isEqual', function () {
        const shader0 = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });

        const shader1 = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });

        const shader2 = new qtek.Shader({
            vertex : vertexCode,

            fragment : fragmentCode.replace('precision mediump float;', 'precision mediump high;')
        });

        assert(shader0.isEqual(shader1));
        assert(!shader0.isEqual(shader2));
    });

    it('bind to renderer shouldn\'t throw an error', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });
        shader.bind(renderer);
    });

    it('#dirty', function () {        
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });
        shader.dirty();

        assert(shader._codeDirty);
    });

    it('define and undefine a macro', function () {
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });
        const macroContent = 'macro content';
        shader.define('fragment', 'SHADOWMAP_ENABLED', macroContent);
        assert(shader.getDefine('fragment', 'SHADOWMAP_ENABLED') === macroContent);

        assert(shader.isDefined('fragment', 'SHADOWMAP_ENABLED'));

        shader.undefine('fragment', 'SHADOWMAP_ENABLED');
        assert(shader.getDefine('fragment', 'SHADOWMAP_ENABLED') === undefined);
    });


    it('enableTexture/disableTexture, enableTexturesAll/disableTexturesAll', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });
        shader.enableTexture('u_image');
        assert(shader.isTextureEnabled('u_image'));
        assert(shader.getEnabledTextures().length === 1);
        shader.bind(renderer);

        const vstart = shader._vertexProcessed.substring(0, 23);
        const fstart = shader._fragmentProcessed.substring(0, 23);
        assert(vstart === '#define U_IMAGE_ENABLED', vstart);
        assert(fstart === '#extension GL_OES_stand', fstart);

        shader.disableTexture('u_image');

        //bind with another to unbind shader
        new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        }).bind(renderer);

        shader.bind(renderer);
        const nvstart = shader._vertexProcessed.substring(0, 23);
        assert(nvstart !== vstart);

        //----enableTexturesAll-----
        shader.enableTexturesAll();
        shader.bind(renderer);
        const nnvstart = shader._vertexProcessed.substring(0, 23);
        assert(nnvstart === vstart);

        //----disableTexturesAll-----
        shader.disableTexturesAll();
        shader.bind(renderer);
        const nnnvstart = shader._vertexProcessed.substring(0, 23);
        assert(nnnvstart !== vstart);
    });

    it('#hasUniform', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });

        shader.bind(renderer);

        assert(shader.hasUniform('u_image'));
    });

    it('textureslot methods', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });

        shader.bind(renderer);

        assert(shader.currentTextureSlot() === 0);
        shader.resetTextureSlot(1);
        assert(shader.currentTextureSlot() === 1);
        shader.resetTextureSlot(0);

        const texture = new qtek.Texture();        
        shader.takeCurrentTextureSlot(renderer, texture);

        assert(shader.currentTextureSlot() === 1);
    });

    it('#setUnform', function () {
        //TODO or escape it as other cases will cover this method
    });

    it('#enableAttributes shoud return actual attrib locations', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });
        shader.bind(renderer);
        const locationList = shader.enableAttributes(renderer, ['position', 'texCoord']);
        assert.deepEqual(locationList, [0,1], JSON.stringify(locationList));
    });

    it('clone', function () {
        const shader = new qtek.Shader({
            vertex : vertexCode,
            fragment : fragmentCode
        });

        shader2 = shader.clone();

        assert.equal(shader.vertex, shader2.vertex);
        assert.equal(shader.fragment, shader2.fragment);
        assert.deepEqual(shader.vertexDefines, shader2.vertexDefines);
        assert.deepEqual(shader.fragmentDefines, shader2.fragmentDefines);
    });
});