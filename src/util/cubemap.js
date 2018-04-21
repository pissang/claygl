// Cubemap prefilter utility
// http://www.unrealengine.com/files/downloads/2013SiggraphPresentationsNotes.pdf
// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch20.html
import Texture2D from '../Texture2D';
import TextureCube from '../TextureCube';
import Texture from '../Texture';
import FrameBuffer from '../FrameBuffer';
import Pass from '../compositor/Pass';
import Material from '../Material';
import Shader from '../Shader';
import Skybox from '../plugin/Skybox';
import Scene from '../Scene';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import vendor from '../core/vendor';
import textureUtil from './texture';

import integrateBRDFShaderCode from './shader/integrateBRDF.glsl.js';
import prefilterFragCode from './shader/prefilter.glsl.js';

var cubemapUtil = {};

var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

// TODO Downsample
/**
 * @name clay.util.cubemap.prefilterEnvironmentMap
 * @param  {clay.Renderer} renderer
 * @param  {clay.Texture} envMap
 * @param  {Object} [textureOpts]
 * @param  {number} [textureOpts.width=64]
 * @param  {number} [textureOpts.height=64]
 * @param  {number} [textureOpts.type]
 * @param  {boolean} [textureOpts.encodeRGBM=false]
 * @param  {boolean} [textureOpts.decodeRGBM=false]
 * @param  {clay.Texture2D} [normalDistribution]
 * @param  {clay.Texture2D} [brdfLookup]
 */
cubemapUtil.prefilterEnvironmentMap = function (
    renderer, envMap, textureOpts, normalDistribution, brdfLookup
) {
    // Not create other renderer, it is easy having issue of cross reference of resources like framebuffer
    // PENDING preserveDrawingBuffer?
    if (!brdfLookup || !normalDistribution) {
        normalDistribution = cubemapUtil.generateNormalDistribution();
        brdfLookup = cubemapUtil.integrateBRDF(renderer, normalDistribution);
    }
    textureOpts = textureOpts || {};

    var width = textureOpts.width || 64;
    var height = textureOpts.height || 64;

    var textureType = textureOpts.type || envMap.type;

    // Use same type with given envMap
    var prefilteredCubeMap = new TextureCube({
        width: width,
        height: height,
        type: textureType,
        flipY: false,
        mipmaps: []
    });

    if (!prefilteredCubeMap.isPowerOfTwo()) {
        console.warn('Width and height must be power of two to enable mipmap.');
    }

    var size = Math.min(width, height);
    var mipmapNum = Math.log(size) / Math.log(2) + 1;

    var prefilterMaterial = new Material({
        shader: new Shader({
            vertex: Shader.source('clay.skybox.vertex'),
            fragment: prefilterFragCode
        })
    });
    prefilterMaterial.set('normalDistribution', normalDistribution);

    textureOpts.encodeRGBM && prefilterMaterial.define('fragment', 'RGBM_ENCODE');
    textureOpts.decodeRGBM && prefilterMaterial.define('fragment', 'RGBM_DECODE');

    var dummyScene = new Scene();
    var skyEnv;

    if (envMap.textureType === 'texture2D') {
        // Convert panorama to cubemap
        var envCubemap = new TextureCube({
            width: width,
            height: height,
            // FIXME FLOAT type will cause GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT error on iOS
            type: textureType === Texture.FLOAT ?
                Texture.HALF_FLOAT : textureType
        });
        textureUtil.panoramaToCubeMap(renderer, envMap, envCubemap, {
            // PENDING encodeRGBM so it can be decoded as RGBM
            encodeRGBM: textureOpts.decodeRGBM
        });
        envMap = envCubemap;
    }
    skyEnv = new Skybox({
        scene: dummyScene,
        material: prefilterMaterial
    });
    skyEnv.material.set('environmentMap', envMap);

    var envMapPass = new EnvironmentMapPass({
        texture: prefilteredCubeMap
    });

    // Force to be UNSIGNED_BYTE
    if (textureOpts.encodeRGBM) {
        textureType = prefilteredCubeMap.type = Texture.UNSIGNED_BYTE;
    }

    var renderTargetTmp = new Texture2D({
        width: width,
        height: height,
        type: textureType
    });
    var frameBuffer = new FrameBuffer({
        depthBuffer: false
    });
    var ArrayCtor = vendor[textureType === Texture.UNSIGNED_BYTE ? 'Uint8Array' : 'Float32Array'];
    for (var i = 0; i < mipmapNum; i++) {
        // console.time('prefilter');
        prefilteredCubeMap.mipmaps[i] = {
            pixels: {}
        };
        skyEnv.material.set('roughness', i / (mipmapNum - 1));

        // Tweak fov
        // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
        var n = renderTargetTmp.width;
        var fov = 2 * Math.atan(n / (n - 0.5)) / Math.PI * 180;

        for (var j = 0; j < targets.length; j++) {
            var pixels = new ArrayCtor(renderTargetTmp.width * renderTargetTmp.height * 4);
            frameBuffer.attach(renderTargetTmp);
            frameBuffer.bind(renderer);

            var camera = envMapPass.getCamera(targets[j]);
            camera.fov = fov;
            renderer.render(dummyScene, camera);
            renderer.gl.readPixels(
                0, 0, renderTargetTmp.width, renderTargetTmp.height,
                Texture.RGBA, textureType, pixels
            );

            // var canvas = document.createElement('canvas');
            // var ctx = canvas.getContext('2d');
            // canvas.width = renderTargetTmp.width;
            // canvas.height = renderTargetTmp.height;
            // var imageData = ctx.createImageData(renderTargetTmp.width, renderTargetTmp.height);
            // for (var k = 0; k < pixels.length; k++) {
            //     imageData.data[k] = pixels[k];
            // }
            // ctx.putImageData(imageData, 0, 0);
            // document.body.appendChild(canvas);

            frameBuffer.unbind(renderer);
            prefilteredCubeMap.mipmaps[i].pixels[targets[j]] = pixels;
        }

        renderTargetTmp.width /= 2;
        renderTargetTmp.height /= 2;
        renderTargetTmp.dirty();
        // console.timeEnd('prefilter');
    }

    frameBuffer.dispose(renderer);
    renderTargetTmp.dispose(renderer);
    skyEnv.dispose(renderer);
    // Remove gpu resource allucated in renderer
    normalDistribution.dispose(renderer);

    // renderer.dispose();

    return {
        environmentMap: prefilteredCubeMap,
        brdfLookup: brdfLookup,
        normalDistribution: normalDistribution,
        maxMipmapLevel: mipmapNum
    };
};

cubemapUtil.integrateBRDF = function (renderer, normalDistribution) {
    normalDistribution = normalDistribution || cubemapUtil.generateNormalDistribution();
    var framebuffer = new FrameBuffer({
        depthBuffer: false
    });
    var pass = new Pass({
        fragment: integrateBRDFShaderCode
    });

    var texture = new Texture2D({
        width: 512,
        height: 256,
        type: Texture.HALF_FLOAT,
        wrapS: Texture.CLAMP_TO_EDGE,
        wrapT: Texture.CLAMP_TO_EDGE,
        minFilter: Texture.NEAREST,
        magFilter: Texture.NEAREST,
        useMipmap: false
    });
    pass.setUniform('normalDistribution', normalDistribution);
    pass.setUniform('viewportSize', [512, 256]);
    pass.attachOutput(texture);
    pass.render(renderer, framebuffer);

    // FIXME Only chrome and firefox can readPixels with float type.
    // framebuffer.bind(renderer);
    // var pixels = new Float32Array(512 * 256 * 4);
    // renderer.gl.readPixels(
    //     0, 0, texture.width, texture.height,
    //     Texture.RGBA, Texture.FLOAT, pixels
    // );
    // texture.pixels = pixels;
    // texture.flipY = false;
    // texture.dirty();
    // framebuffer.unbind(renderer);

    framebuffer.dispose(renderer);

    return texture;
};

cubemapUtil.generateNormalDistribution = function (roughnessLevels, sampleSize) {

    // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
    // GLSL not support bit operation, use lookup instead
    // V -> i / N, U -> roughness
    var roughnessLevels = roughnessLevels || 256;
    var sampleSize = sampleSize || 1024;

    var normalDistribution = new Texture2D({
        width: roughnessLevels,
        height: sampleSize,
        type: Texture.FLOAT,
        minFilter: Texture.NEAREST,
        magFilter: Texture.NEAREST,
        wrapS: Texture.CLAMP_TO_EDGE,
        wrapT: Texture.CLAMP_TO_EDGE,
        useMipmap: false
    });
    var pixels = new Float32Array(sampleSize * roughnessLevels * 4);
    var tmp = [];

    // function sortFunc(a, b) {
    //     return Math.abs(b) - Math.abs(a);
    // }
    for (var j = 0; j < roughnessLevels; j++) {
        var roughness = j / roughnessLevels;
        var a = roughness * roughness;

        for (var i = 0; i < sampleSize; i++) {
            // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators
            // http://stackoverflow.com/questions/1908492/unsigned-integer-in-javascript
            // http://stackoverflow.com/questions/1822350/what-is-the-javascript-operator-and-how-do-you-use-it
            var y = (i << 16 | i >>> 16) >>> 0;
            y = ((y & 1431655765) << 1 | (y & 2863311530) >>> 1) >>> 0;
            y = ((y & 858993459) << 2 | (y & 3435973836) >>> 2) >>> 0;
            y = ((y & 252645135) << 4 | (y & 4042322160) >>> 4) >>> 0;
            y = (((y & 16711935) << 8 | (y & 4278255360) >>> 8) >>> 0) / 4294967296;

            // CDF
            var cosTheta = Math.sqrt((1 - y) / (1 + (a * a - 1.0) * y));
            tmp[i] = cosTheta;
        }

        for (var i = 0; i < sampleSize; i++) {
            var offset = (i * roughnessLevels + j) * 4;
            var cosTheta = tmp[i];
            var sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
            var x = i / sampleSize;
            var phi = 2.0 * Math.PI * x;
            pixels[offset] = sinTheta * Math.cos(phi);
            pixels[offset + 1] = cosTheta;
            pixels[offset + 2] = sinTheta * Math.sin(phi);
            pixels[offset + 3] = 1.0;
        }
    }
    normalDistribution.pixels = pixels;

    return normalDistribution;
};

export default cubemapUtil;
