// Spherical Harmonic Helpers
define(function (require) {

    var Texture = require('../Texture');
    var FrameBuffer = require('../FrameBuffer');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');
    var textureUtil = require('./texture');
    var Pass = require('../compositor/Pass');
    var vendor = require('../core/vendor');

    var sh = {};

    var projectEnvMapShaderCode = require('./shader/projectEnvMap.essl');

    sh.projectEnvironmentMap = function (renderer, envMap) {

        if (envMap instanceof Texture2D) {
            // Convert panorama to cubemap
            var envCubemap = new TextureCube({
                width: 64,
                height: 64,
                type: Texture.FLOAT
            });
            textureUtil.panoramaToCubeMap(renderer, envMap, envCubemap);
            envMap = envCubemap;
        }

        var shTexture = new Texture2D({
            type: Texture.FLOAT,
            width: 9,
            height: 1
        });
        var pass = new Pass({
            fragment: projectEnvMapShaderCode
        });
        pass.material.shader.define('fragment', 'TEXTURE_SIZE', envMap.width);
        pass.setUniform('environmentMap', envMap);

        var framebuffer = new FrameBuffer();
        framebuffer.attach(shTexture);
        pass.render(renderer, framebuffer);

        framebuffer.bind(renderer);
        // TODO Only chrome and firefox support Float32Array
        var pixels = new vendor.Float32Array(9 * 4);
        renderer.gl.readPixels(0, 0, 9, 1, Texture.RGBA, Texture.FLOAT, pixels);

        var coeff = new vendor.Float32Array(9 * 3);
        for (var i = 0; i < 9; i++) {
            coeff[i * 3] = pixels[i * 4];
            coeff[i * 3 + 1] = pixels[i * 4 + 1];
            coeff[i * 3 + 2] = pixels[i * 4 + 2];
        }
        framebuffer.unbind(renderer);

        framebuffer.dispose(renderer.gl);
        pass.dispose(renderer.gl);

        return coeff;
    };

    return sh;
});