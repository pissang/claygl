import coloradjustEssl from './source/compositor/coloradjust.glsl.js';
import blurEssl from './source/compositor/blur.glsl.js';
import lumEssl from './source/compositor/lum.glsl.js';
import lutEssl from './source/compositor/lut.glsl.js';
import vigentteEssl from './source/compositor/vignette.glsl.js';
import outputEssl from './source/compositor/output.glsl.js';
import brightEssl from './source/compositor/bright.glsl.js';
import downsampleEssl from './source/compositor/downsample.glsl.js';
import upsampleEssl from './source/compositor/upsample.glsl.js';
import hdrEssl from './source/compositor/hdr.glsl.js';
import lensflareEssl from './source/compositor/lensflare.glsl.js';
import blendEssl from './source/compositor/blend.glsl.js';
import fxaaEssl from './source/compositor/fxaa.glsl.js';
// import fxaa3Essl from './source/compositor/fxaa3.glsl.js';

// TODO Must export a module and be used in the other modules. Or it will be tree shaked
export default function register(Shader) {
    // Some build in shaders
    Shader['import'](coloradjustEssl);
    Shader['import'](blurEssl);
    Shader['import'](lumEssl);
    Shader['import'](lutEssl);
    Shader['import'](vigentteEssl);
    Shader['import'](outputEssl);
    Shader['import'](brightEssl);
    Shader['import'](downsampleEssl);
    Shader['import'](upsampleEssl);
    Shader['import'](hdrEssl);
    Shader['import'](lensflareEssl);
    Shader['import'](blendEssl);

    Shader['import'](fxaaEssl);

}