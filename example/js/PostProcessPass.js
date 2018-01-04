define(function (require) {
    var clay = require('../../dist/claygl');

    function PostProcessPass(shader, renderToTarget, clearColor) {
        this._pass = new clay.compositor.Pass({
            fragment: shader,
            clearColor: clearColor
        });
        if (renderToTarget) {
            this._frameBuffer = new clay.FrameBuffer();
            this._targetTexture = new clay.Texture2D();
        }
    }
    PostProcessPass.prototype.setUniform = function (key, val) {
        this._pass.setUniform(key, val);
    };
    PostProcessPass.prototype.getUniform = function (key) {
        return this._pass.getUniform(key);
    };

    PostProcessPass.prototype.render = function (renderer) {
        if (this._frameBuffer) {
            this._frameBuffer.attach(this._targetTexture);
        }
        this._pass.render(renderer, this._frameBuffer);
    };
    PostProcessPass.prototype.resize = function (width, height) {
        if (this._targetTexture) {
            this._targetTexture.width = width;
            this._targetTexture.height = height;
            this._targetTexture.dirty();
        }
    };
    PostProcessPass.prototype.getTargetTexture = function () {
        return this._targetTexture;
    };
    PostProcessPass.prototype.getMaterial = function () {
        return this._pass.material;
    };

    return PostProcessPass;
});