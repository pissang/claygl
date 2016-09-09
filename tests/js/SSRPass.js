define(function (require) {
    var qtek = require('qtek');

    qtek.Shader.import(require('text!../shader/ssr.essl'));

    function SSRPass(opt) {
        opt = opt || {};

        this._ssrPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssr.fragment')
        });

        this._gBuffer = opt.gBuffer;
    }

    SSRPass.prototype.render = function (renderer, camera, colorTex) {
        var ssrPass = this._ssrPass;

        ssrPass.setUniform('colorTex', colorTex);
        ssrPass.setUniform('normalTex', this._gBuffer.getNormalTex());
        ssrPass.setUniform('depthTex', this._gBuffer.getDepthTex());

        var viewInverseTranspose = new qtek.math.Matrix4();
        qtek.math.Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssrPass.setUniform('projection', camera.projectionMatrix._array);
        ssrPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssrPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        ssrPass.setUniform('viewportSize', [renderer.getWidth(), renderer.getHeight()]);
        ssrPass.setUniform('nearZ', camera.near);

        ssrPass.render(renderer);
    };

    SSRPass.prototype.setParameter = function (name, val) {
        if (name === 'maxIteration') {
            this._ssrPass.material.shader.define('fragment', 'MAX_ITERATION', val);
        }
        else if (name === 'maxBinarySearchIteration') {
            this._ssrPass.material.shader.define('fragment', 'MAX_BINARY_SEARCH_ITERATION', val);
        }
        else {
            this._ssrPass.setUniform(name, val);
        }
    };

    return SSRPass;
});