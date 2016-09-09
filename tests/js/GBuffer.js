define(function (require) {
    var qtek = require('qtek');

    qtek.Shader.import(require('text!../shader/normal.essl'));

    function GBuffer() {
        this._globalGBufferMat = new qtek.Material({
            shader: new qtek.Shader({
                vertex: qtek.Shader.source('normal.vertex'),
                fragment: qtek.Shader.source('normal.fragment')
            })
        });

        this._gBufferFramebuffer = new qtek.FrameBuffer();

        this._normalTex = new qtek.Texture2D({
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST
        });
        this._depthTex = new qtek.Texture2D({
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST,
            format: qtek.Texture.DEPTH_COMPONENT,
            type: qtek.Texture.UNSIGNED_INT
        });
    }

    GBuffer.prototype.resize = function (width, height) {
        this._normalTex.width = width;
        this._normalTex.height = height;
        this._normalTex.dirty();

        this._depthTex.width = width;
        this._depthTex.height = height;
        this._depthTex.dirty();

    };

    GBuffer.prototype.update = function (renderer, scene, camera) {

        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._normalTex);
        this._gBufferFramebuffer.attach(renderer.gl, this._depthTex, renderer.gl.DEPTH_ATTACHMENT);
        renderer.gl.clearColor(0, 0, 0, 0);
        renderer.gl.depthMask(true);
        renderer.gl.colorMask(true, true, true, true);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT | renderer.gl.DEPTH_BUFFER_BIT);
        renderer.gl.disable(renderer.gl.BLEND);

        var oldBeforeRender = renderer.beforeRender;
        var globalGBufferMat = this._globalGBufferMat;
        renderer.beforeRender = function (renderable) {
            // TODO Texture
            var glossiness = renderable.material.get('glossiness');
            globalGBufferMat.shader.setUniform(
                renderer.gl, glossiness.type, 'glossiness', glossiness.value
            );
        };

        renderer.renderQueue(scene.opaqueQueue, camera, globalGBufferMat);
        renderer.renderQueue(scene.transparentQueue, camera, globalGBufferMat);

        renderer.beforeRender = oldBeforeRender;

        this._gBufferFramebuffer.unbind(renderer);
    };

    GBuffer.prototype.getNormalTex = function () {
        return this._normalTex;
    };

    GBuffer.prototype.getDepthTex = function () {
        return this._depthTex;
    };

    return GBuffer;
});