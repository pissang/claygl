define(function (require) {
    var qtek = require('qtek');

    qtek.Shader.import(require('text!../shader/normal.essl'));

    function createFillCanvas(color) {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = color || '#000';
        ctx.fillRect(0, 0, 1, 1);

        return canvas;
    }

    function createBlankNormalTex() {
        return new qtek.Texture2D({
            image: createFillCanvas('#000')
        });
    }

    function createBlankRoughnessTex() {
        return new qtek.Texture2D({
            image: createFillCanvas('#000')
        });
    }

    function GBuffer() {
        this._globalGBufferMat = new qtek.Material({
            shader: new qtek.Shader({
                vertex: qtek.Shader.source('normal.vertex'),
                fragment: qtek.Shader.source('normal.fragment')
            })
        });

        this._globalGBufferMat.shader.enableTexture(['normalMap', 'roughnessMap']);

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

        this._defaultNormalMap = createBlankNormalTex();
        this._defaultRoughnessMap = createBlankRoughnessTex();
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

        var gl = renderer.gl;

        if (renderer.getWidth() !== this._normalTex.width ||
            renderer.getHeight() !== this._normalTex.height
        ) {
            this._resize(renderer.getWidth(), renderer.getHeight());
        }

        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._normalTex);
        this._gBufferFramebuffer.attach(renderer.gl, this._depthTex, renderer.gl.DEPTH_ATTACHMENT);
        gl.clearColor(0, 0, 0, 0);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        var oldBeforeRender = renderer.beforeRenderObject;
        var globalGBufferMat = this._globalGBufferMat;

        function attachTextureToSlot(shader, symbol, texture, slot) {
            shader.setUniform(gl, '1i', symbol, slot);

            gl.activeTexture(gl.TEXTURE0 + slot);
            // Maybe texture is not loaded yet;
            if (texture.isRenderable()) {
                texture.bind(gl);
            }
            else {
                // Bind texture to null
                texture.unbind(gl);
            }
        }

        var previousNormalMap;
        var previousRougnessMap;
        var defaultNormalMap = this._defaultNormalMap;
        var defaultRougnessMap = this._defaultRoughnessMap;
        renderer.beforeRenderObject = function (renderable, prevMaterial) {
            var material = renderable.material;
            // TODO Texture
            var glossiness = material.get('glossiness');
            var normalMap = material.get('normalMap') || defaultNormalMap;
            var roughnessMap = material.get('roughnessMap');
            var uvRepeat = material.get('uvRepeat');
            var uvOffset = material.get('uvOffset');
            var tintGloss = !roughnessMap;
            roughnessMap = roughnessMap || defaultRougnessMap;

            if (!prevMaterial) {
                globalGBufferMat.set('glossiness', glossiness);
                globalGBufferMat.set('normalMap', normalMap);
                globalGBufferMat.set('roughnessMap', roughnessMap);
                globalGBufferMat.set('tintGloss', +tintGloss);
                globalGBufferMat.set('uvRepeat', uvRepeat);
                globalGBufferMat.set('uvOffset', uvOffset);
            }
            else {
                globalGBufferMat.shader.setUniform(
                    gl, '1f', 'glossiness', glossiness
                );
                if (previousNormalMap !== normalMap) {
                    attachTextureToSlot(globalGBufferMat.shader, 'normalMap', normalMap, 0);
                }
                if (previousRougnessMap !== roughnessMap) {
                    attachTextureToSlot(globalGBufferMat.shader, 'roughnessMap', roughnessMap, 1);
                }
                globalGBufferMat.shader.setUniform(gl, '1i', 'tintGloss', +tintGloss);
                globalGBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
                globalGBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);
            }

            previousNormalMap = normalMap;
            previousRougnessMap = roughnessMap;
        };

        renderer.renderQueue(scene.opaqueQueue, camera, globalGBufferMat);
        renderer.renderQueue(scene.transparentQueue, camera, globalGBufferMat);

        renderer.beforeRenderObject = oldBeforeRender;

        this._gBufferFramebuffer.unbind(renderer);

        // Render buffer back
        // http://www.kode80.com/blog/2015/03/11/screen-space-reflections-in-unity-5/
        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._backDepthTex, renderer.gl.DEPTH_ATTACHMENT);
        gl.depthMask(true);
        gl.colorMask(false, false, false, false);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        function updateCullface(renderable) {
            var oldCullFace = renderable.cullFace;
            renderable.cullFace = oldCullFace === gl.FRONT
                ? gl.BACK : gl.FRONT;
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
        gl.colorMask(true, true, true, true);
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