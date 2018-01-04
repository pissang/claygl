const assert = require('assert');
const { util, helper } = require('./../common/');
const clay = require('../../dist/claygl');

//from webglfundamentals
const vertexCode = `
    attribute vec2 position: POSITION;
    attribute vec2 texCoord: TEXCOORD;

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

function createMesh() {
    const shader = new clay.Shader(vertexCode, fragmentCode);
    const material = new clay.Material({
        shader: shader
    });
    const mesh = new clay.Mesh({
        material: material,
        geometry: new clay.geometry.Cube()
    });
    return mesh;
}

describe('Program.Spec', function () {
    it('constructor', function () {
        const shader = new clay.Shader(vertexCode, fragmentCode);

        assert(shader.attributeSemantics['POSITION']);
        assert(shader.attributeSemantics['TEXCOORD']);
    });


    it('define and undefine a macro', function () {
        const mesh = createMesh();
        const macroContent = 'macro content';
        mesh.material.define('fragment', 'SHADOWMAP_ENABLED', macroContent);
        assert(mesh.material.getDefine('fragment', 'SHADOWMAP_ENABLED') === macroContent);

        assert(mesh.material.isDefined('fragment', 'SHADOWMAP_ENABLED'));

        mesh.material.undefine('fragment', 'SHADOWMAP_ENABLED');
        assert(mesh.material.getDefine('fragment', 'SHADOWMAP_ENABLED') === undefined);
    });


    it('enableTexture/disableTexture, enableTexturesAll/disableTexturesAll', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const mesh = createMesh();
        const material = mesh.material;

        material.enableTexture('u_image');
        assert(material.isTextureEnabled('u_image'));
        assert(material.getEnabledTextures().length === 1);

        var program = renderer.getProgram(mesh);
        const vstart = program.vertexCode.substring(0, 23);
        const fstart = program.fragmentCode.substring(0, 23);
        assert(vstart === '#define U_IMAGE_ENABLED', vstart);
        assert(fstart === '#extension GL_OES_stand', fstart);

        material.disableTexture('u_image');

        program = renderer.getProgram(mesh);
        const nvstart = program.vertexCode.substring(0, 23);
        assert(nvstart !== vstart);

        //----enableTexturesAll-----
        material.enableTexturesAll();
        program = renderer.getProgram(mesh);
        const nnvstart = program.vertexCode.substring(0, 23);
        assert(nnvstart === vstart);

        //----disableTexturesAll-----
        material.disableTexturesAll();
        program = renderer.getProgram(mesh);
        const nnnvstart = program.vertexCode.substring(0, 23);
        assert(nnnvstart !== vstart);
    });

    it('#hasUniform', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const mesh = createMesh();
        var program = renderer.getProgram(mesh);

        assert(program.hasUniform('u_image'));
    });

    it('textureslot methods', function () {
        const { renderer, scene, camera } = helper.createQtekScene();

        const mesh = createMesh();
        var program = renderer.getProgram(mesh);

        program.bind(renderer);

        assert(program.currentTextureSlot() === 0);
        program.resetTextureSlot(1);
        assert(program.currentTextureSlot() === 1);
        program.resetTextureSlot(0);

        const texture = new clay.Texture();
        program.takeCurrentTextureSlot(renderer, texture);

        assert(program.currentTextureSlot() === 1);
    });

    it('#setUnform', function () {
        //TODO or escape it as other cases will cover this method
    });

    it('#enableAttributes shoud return actual attrib locations', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        const mesh = createMesh();
        var program = renderer.getProgram(mesh);

        const locationList = program.enableAttributes(renderer, ['position', 'texCoord']);
        assert.deepEqual(locationList, [0,1], JSON.stringify(locationList));
    });
});