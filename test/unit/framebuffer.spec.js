const assert = require('assert');
const { util, helper } = require('./../common/');
const clay = require('../../dist/claygl');

describe('FrameBuffer.Spec', function () {
    it('constructor', function () {
        const { renderer, scene, camera } = helper.createQtekScene();
        const frameBuffer = new clay.FrameBuffer();

        assert(frameBuffer.depthBuffer);
    });

    it('can attach to a texture', function () {
        const { canvas, renderer, scene, camera } = helper.createQtekScene();
        const gl = canvas.gl;

        //create an empty texture
        const texture = new clay.Texture();
        const frameBuffer = new clay.FrameBuffer();

        //default attach
        frameBuffer.attach(texture);

        assert(frameBuffer._textures[gl.COLOR_ATTACHMENT0].texture === texture);
    });

    it('can detach a target', function () {
        const { canvas, renderer, scene, camera } = helper.createQtekScene();
        const gl = canvas.gl;

        //create an empty texture
        const texture = new clay.Texture();
        const frameBuffer = new clay.FrameBuffer();

        //default attach
        frameBuffer.attach(texture);

        frameBuffer.detach(gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D);

        assert(!frameBuffer._textures[gl.COLOR_ATTACHMENT0]);
    });

    it('can bind to a renderer', function () {
        const { canvas, renderer, scene, camera } = helper.createQtekScene();
        const gl = canvas.gl;

        //create an empty texture
        const texture = new clay.Texture();
        const frameBuffer = new clay.FrameBuffer();
        assert(frameBuffer.getTextureWidth() === 0);
        assert(frameBuffer.getTextureHeight() === 0);
        //default attach
        frameBuffer.attach(texture);

        frameBuffer.bind(renderer);

        assert(frameBuffer.checkStatus(gl) === gl.FRAMEBUFFER_COMPLETE, frameBuffer.checkStatus(gl));
        assert(renderer.__currentFrameBuffer === frameBuffer);
        assert(frameBuffer.getTextureWidth() === texture.width);
        assert(frameBuffer.getTextureHeight() === texture.height);
    });

    it('unbind', function () {
        const { canvas, renderer, scene, camera } = helper.createQtekScene();
        const gl = canvas.gl;

        //create an empty texture
        const texture = new clay.Texture();
        const frameBuffer = new clay.FrameBuffer();
        //default attach
        frameBuffer.attach(texture);

        frameBuffer.bind(renderer);

        frameBuffer.unbind(renderer);

        assert(frameBuffer.checkStatus(gl) === gl.FRAMEBUFFER_COMPLETE);
        assert(!renderer.__currentFrameBuffer);
    });
});