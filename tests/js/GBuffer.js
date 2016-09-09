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
        // Use depth back texture to calculate thickness
        this._backDepthTex = new qtek.Texture2D({
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST,
            format: qtek.Texture.DEPTH_COMPONENT,
            type: qtek.Texture.UNSIGNED_INT
        });
    }

    GBuffer.prototype._resize = function (width, height) {
        this._normalTex.width = width;
        this._normalTex.height = height;
        this._normalTex.dirty();

        this._depthTex.width = width;
        this._depthTex.height = height;
        this._depthTex.dirty();

        this._backDepthTex.width = width;
        this._backDepthTex.height = height;
        this._backDepthTex.dirty();
    };

    GBuffer.prototype.update = function (renderer, scene, camera) {

        if (renderer.getWidth() !== this._normalTex.width ||
            renderer.getHeight() !== this._normalTex.height
        ) {
            this._resize(renderer.getWidth(), renderer.getHeight());
        }

        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._normalTex);
        this._gBufferFramebuffer.attach(renderer.gl, this._depthTex, renderer.gl.DEPTH_ATTACHMENT);
        renderer.gl.clearColor(0, 0, 0, 0);
        renderer.gl.depthMask(true);
        renderer.gl.colorMask(true, true, true, true);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT | renderer.gl.DEPTH_BUFFER_BIT);
        renderer.gl.disable(renderer.gl.BLEND);

        var oldBeforeRender = renderer.beforeRenderObject;
        var globalGBufferMat = this._globalGBufferMat;
        renderer.beforeRenderObject = function (renderable, prevMaterial) {
            // TODO Texture
            var glossiness = renderable.material.get('glossiness');
            if (!prevMaterial) {
                globalGBufferMat.set('glossiness', glossiness);
            }
            else {
                globalGBufferMat.shader.setUniform(
                    renderer.gl, '1f', 'glossiness', glossiness
                );
            }
        };

        renderer.renderQueue(scene.opaqueQueue, camera, globalGBufferMat);
        renderer.renderQueue(scene.transparentQueue, camera, globalGBufferMat);

        renderer.beforeRenderObject = oldBeforeRender;

        this._gBufferFramebuffer.unbind(renderer);

        // Render buffer back
        // http://www.kode80.com/blog/2015/03/11/screen-space-reflections-in-unity-5/
        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._backDepthTex, renderer.gl.DEPTH_ATTACHMENT);
        renderer.gl.depthMask(true);
        renderer.gl.colorMask(false, false, false, false);
        renderer.gl.clear(renderer.gl.DEPTH_BUFFER_BIT);

        function updateCullface(renderable) {
            var oldCullFace = renderable.cullFace;
            renderable.cullFace = oldCullFace === renderer.gl.FRONT
                ? renderer.gl.BACK : renderer.gl.FRONT;
            renderable.__cullFace = oldCullFace;
        }
        function restoreCullface(renderable) {
            renderable.cullFace = renderable.__cullFace;
        }
        scene.opaqueQueue.forEach(updateCullface);
        scene.transparentQueue.forEach(updateCullface);

        renderer.renderQueue(scene.opaqueQueue, camera, globalGBufferMat);
        renderer.renderQueue(scene.transparentQueue, camera, globalGBufferMat);

        scene.opaqueQueue.forEach(restoreCullface);
        scene.transparentQueue.forEach(restoreCullface);
        this._gBufferFramebuffer.unbind(renderer);
        renderer.gl.colorMask(true, true, true, true);
    };

    GBuffer.prototype.getNormalTex = function () {
        return this._normalTex;
    };

    GBuffer.prototype.getDepthTex = function () {
        return this._depthTex;
    };

    GBuffer.prototype.getBackDepthTex = function () {
        return this._backDepthTex;
    };

    return GBuffer;
});