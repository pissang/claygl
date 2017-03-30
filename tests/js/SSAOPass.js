define(function (require) {
    var qtek = require('qtek');
    var Matrix4 = qtek.math.Matrix4;
    var Vector3 = qtek.math.Vector3;

    qtek.Shader.import(require('text!../shader/ssao.essl'));

    function generateNoiseData(size) {
        var data = new Uint8Array(size * size * 4);
        var n = 0;
        var v3 = new Vector3();
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize();
                data[n++] = (v3.x * 0.5 + 0.5) * 255;
                data[n++] = (v3.y * 0.5 + 0.5) * 255;
                data[n++] = 0;
                data[n++] = 255;
            }
        }
        return data;
    }

    function generateNoiseTexture(size) {
        return new qtek.Texture2D({
            pixels: generateNoiseData(size),
            wrapS: qtek.Texture.REPEAT,
            wrapT: qtek.Texture.REPEAT,
            width: size,
            height: size
        });
    }

    function generateKernel(size) {
        var kernel = new Float32Array(size * 3);
        var v3 = new Vector3();
        for (var i = 0; i < size; i++) {
            v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random())
                .normalize().scale(Math.random());
            kernel[i * 3] = v3.x;
            kernel[i * 3 + 1] = v3.y;
            kernel[i * 3 + 2] = v3.z;
        }
        return kernel;
    }

    function SSAOPass(opt) {
        opt = opt || {};

        this._ssaoPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.fragment')
        });
        this._blurPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.blur.fragment')
        });
        this._framebuffer = new qtek.FrameBuffer();
        this._ssaoTexture = new qtek.Texture2D();

        this.setNoiseSize(4);
        this.setKernelSize(opt.kernelSize || 64);
        this.setParameter('blurSize', Math.round(opt.blurSize || 4));
        if (opt.radius != null) {
            this.setParameter('radius', opt.radius);
        }
        if (opt.power != null) {
            this.setParameter('power', opt.power);
        }
    }

    SSAOPass.prototype.render = function (deferredRenderer, forwardRenderer, camera) {
        var width = forwardRenderer.getWidth();
        var height = forwardRenderer.getHeight();
        var gBufferTex = deferredRenderer.getGBuffer();
        var ssaoPass = this._ssaoPass;
        var blurPass = this._blurPass;

        if (!deferredRenderer.useDepthTexture) {
            ssaoPass.material.shader.define('fragment', 'DEPTH_ENCODED');
        }
        else {
            ssaoPass.material.shader.undefine('fragment', 'DEPTH_ENCODED');
        }
        ssaoPass.setUniform('gBufferTex', gBufferTex);
        ssaoPass.setUniform('depthTex', deferredRenderer.getDepthBuffer());
        ssaoPass.setUniform('gBufferTexSize', [gBufferTex.width, gBufferTex.height]);
        ssaoPass.setUniform('viewportSize', [width, height]);

        var viewInverseTranspose = new Matrix4();
        Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssaoPass.setUniform('projection', camera.projectionMatrix._array);
        ssaoPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssaoPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        var ssaoTexture = this._ssaoTexture;
        if (width !== ssaoTexture.width || height !== ssaoTexture.height) {
            ssaoTexture.width = width;
            ssaoTexture.height = height;
            ssaoTexture.dirty();
        }
        this._framebuffer.attach(ssaoTexture);
        this._framebuffer.bind(forwardRenderer);
        forwardRenderer.gl.clearColor(1, 1, 1, 1);
        forwardRenderer.gl.clear(forwardRenderer.gl.COLOR_BUFFER_BIT);
        ssaoPass.render(forwardRenderer);
        this._framebuffer.unbind(forwardRenderer);

        blurPass.material.blend = function (gl) {
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
        };
        // blurPass.blendWithPrevious = true;
        blurPass.setUniform('textureSize', [width, height]);
        blurPass.setUniform('texture', ssaoTexture);
        blurPass.render(forwardRenderer);
    };

    SSAOPass.prototype.setParameter = function (name, val) {
        if (name === 'noiseTexSize') {
            this.setNoiseSize(val);
        }
        else if (name === 'kernelSize') {
            this.setKernelSize(val);
        }
        else if (name === 'blurSize') {
            this._blurPass.material.shader.define('fragment', 'BLUR_SIZE', val);
        }
        else {
            this._ssaoPass.setUniform(name, val);
        }
    };

    SSAOPass.prototype.setKernelSize = function (size) {
        this._ssaoPass.material.shader.define('fragment', 'KERNEL_SIZE', size);
        this._ssaoPass.setUniform('kernel', generateKernel(size));
    };

    SSAOPass.prototype.setNoiseSize = function (size) {
        var texture = this._ssaoPass.getUniform('noiseTex');
        if (!texture) {
            texture = generateNoiseTexture(size);
            this._ssaoPass.setUniform('noiseTex', generateNoiseTexture(size));
        }
        else {
            texture.data = generateNoiseData(size);
            texture.width = texture.height = size;
            texture.dirty();
        }

        this._ssaoPass.setUniform('noiseTexSize', [size, size]);
    };

    return SSAOPass;
});