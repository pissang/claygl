define(function (require) {
    var qtek = require('qtek');
    var PostProcessPass = require('./PostProcessPass');

    qtek.Shader.import(require('text!../shader/ssr.essl'));


    function SSRPass(opt) {
        opt = opt || {};
        this._gBuffer = opt.gBuffer;

        // this._mipmapPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.output'), true);
        // FXIME Why ssr needs to clear color buffer
        this._ssrPass = new PostProcessPass(qtek.Shader.source('ssr.fragment'), true, [0, 0, 0, 0]);
        this._blurPass1 = new PostProcessPass(qtek.Shader.source('ssr.blur_h'), true);
        this._blurPass2 = new PostProcessPass(qtek.Shader.source('ssr.blur_v'), true);

        this._blendPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.blend'), opt.renderToTexture, true);
        // Pass texture will all be enabled
        this._blendPass.getShader().disableTexturesAll();
        this._blendPass.getShader().enableTexture(['texture1', 'texture2']);

        this._ssrPass.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());
        this._ssrPass.setUniform('gBufferTexture2', this._gBuffer.getTargetTexture2());
        // this._ssrPass.setUniform('backDepthTex', this._gBuffer.getBackDepthTex());

        // this._ssrPass.setUniform('colorTex', this._mipmapPass.getTargetTexture());

        this._blurPass1.setUniform('colorTex', this._ssrPass.getTargetTexture());
        this._blurPass1.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());
        this._blurPass2.setUniform('colorTex', this._blurPass1.getTargetTexture());
        this._blurPass2.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());

        this._blendPass.setUniform('texture1', this._blurPass2.getTargetTexture());

        // this._blendPass.setUniform('weight2', 0);

        if (opt.RGBM) {
            this._ssrPass.getShader().define('fragment', 'RGBM');
            this._blurPass1.getShader().define('fragment', 'RGBM');
            this._blurPass2.getShader().define('fragment', 'RGBM');
            this._blendPass.getShader().define('fragment', 'RGBM');
        }

        this._width;
        this._height;
    }

    SSRPass.prototype._resize = function (width, height) {
        this._width = width;
        this._height = height;

        // var mathUtil = qtek.math.util;
        // var widthPOT = mathUtil.nearestPowerOfTwo(width);
        // var heightPOT = mathUtil.nearestPowerOfTwo(height);

        // this._maxMipmapLevel = Math.log(Math.max(widthPOT, heightPOT)) / Math.log(2);

        // this._mipmapPass.resize(widthPOT, heightPOT);

        this._ssrPass.resize(Math.round(width / 2), Math.round(height / 2));
        this._blurPass1.resize(width, height);
        this._blurPass2.resize(width, height);
        this._blendPass.resize(width, height);
    };

    SSRPass.prototype.render = function (renderer, camera, colorTex) {
        if (renderer.getWidth() !== this._width ||
            renderer.getHeight() !== this._height
        ) {
            this._resize(renderer.getWidth(), renderer.getHeight());
        }

        // var mipmapPass = this._mipmapPass;
        // mipmapPass.setUniform('texture', colorTex);
        // mipmapPass.render(renderer);

        var ssrPass = this._ssrPass;

        var viewInverseTranspose = new qtek.math.Matrix4();
        qtek.math.Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssrPass.setUniform('colorTex', colorTex);
        ssrPass.setUniform('projection', camera.projectionMatrix._array);
        ssrPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssrPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        ssrPass.setUniform('nearZ', camera.near);

        // ssrPass.setUniform('maxMipmapLevel', this._maxMipmapLevel);

        ssrPass.render(renderer);
        var ssrTex = ssrPass.getTargetTexture();
        var blurPass1Tex = this._blurPass1.getTargetTexture();
        this._blurPass1.setUniform('textureSize', [ssrTex.width, ssrTex.height]);
        this._blurPass1.render(renderer);
        this._blurPass2.setUniform('textureSize', [blurPass1Tex.width, blurPass1Tex.height]);
        this._blurPass2.render(renderer);

        this._blendPass.setUniform('texture2', colorTex);
        this._blendPass.render(renderer);
    };

    SSRPass.prototype.setParameter = function (name, val) {
        if (name === 'maxIteration') {
            this._ssrPass.getShader().define('fragment', 'MAX_ITERATION', val);
        }
        else if (name === 'maxBinarySearchIteration') {
            this._ssrPass.getShader().define('fragment', 'MAX_BINARY_SEARCH_ITERATION', val);
        }
        else {
            this._ssrPass.setUniform(name, val);
        }
    };

    SSRPass.prototype.getTargetTexture = function () {
        return this._blendPass.getTargetTexture();
    };

    return SSRPass;
});