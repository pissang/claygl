define(function (require) {
    var qtek = require('qtek');
    var Matrix4 = qtek.math.Matrix4;
    var Vector2 = qtek.math.Vector2;
    var PostProcessPass = require('./PostProcessPass');

    qtek.Shader.import(require('text!../shader/alchemy.essl'));

    function generateKernel(size) {
        var kernel = new Float32Array(size * 2);
        var v2 = new Vector2();
        for (var i = 0; i < size; i++) {
            v2.set(Math.random() * 2 - 1, Math.random() * 2 - 1)
                .normalize().scale(Math.random());
            kernel[i * 3] = v2.x;
            kernel[i * 3 + 1] = v2.y;
        }
        return kernel;
    }

    function AlchemyAO(opt) {
        opt = opt || {};

        this._ssaoPass = new PostProcessPass(qtek.Shader.source('alchemy.fragment'), true, [1, 1, 1, 1]);
        this._blurPass = new PostProcessPass(qtek.Shader.source('alchemy.blur.fragment'), opt.renderToTexture);

        this.setKernelSize(opt.kernelSize || 16);
        this.setParameter('blurSize', opt.blurSize || 4);
        if (opt.radius != null) {
            this.setParameter('radius', opt.radius);
        }
        if (opt.power != null) {
            this.setParameter('power', opt.power);
        }

        this._gBuffer = opt.gBuffer;
    }

    AlchemyAO.prototype.render = function (renderer, camera) {
        var width = renderer.getWidth();
        var height = renderer.getHeight();
        var gBuffer = this._gBuffer;
        var ssaoPass = this._ssaoPass;
        var blurPass = this._blurPass;

        ssaoPass.setUniform('normalTex', gBuffer.getNormalTex());
        ssaoPass.setUniform('depthTex', gBuffer.getDepthTex());
        ssaoPass.setUniform('textureSize', [width, height]);
        ssaoPass.setUniform('viewportSize', [width, height]);

        var viewInverseTranspose = new Matrix4();
        Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssaoPass.setUniform('projection', camera.projectionMatrix._array);
        ssaoPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssaoPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        var ssaoTexture = this._ssaoPass.getTargetTexture();
        if (width !== ssaoTexture.width || height !== ssaoTexture.height) {
            this._ssaoPass.resize(width, height);
            this._blurPass.resize(width, height);
        }
        ssaoPass.render(renderer);

        blurPass.setUniform('textureSize', [width, height]);
        blurPass.setUniform('texture', ssaoTexture);
        blurPass.render(renderer);
    };

    AlchemyAO.prototype.setParameter = function (name, val) {
        if (name === 'kernelSize') {
            this.setKernelSize(val);
        }
        else if (name === 'blurSize') {
            this._blurPass.getShader().define('fragment', 'BLUR_SIZE', val);
        }
        else {
            this._ssaoPass.setUniform(name, val);
        }
    };

    AlchemyAO.prototype.setKernelSize = function (size) {
        this._ssaoPass.getShader().define('fragment', 'KERNEL_SIZE', size);
        this._ssaoPass.setUniform('kernel', generateKernel(size));
    };

    return AlchemyAO;
});