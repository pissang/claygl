import vertexGlsl from '../shader/source/compositor/vertex.glsl';
import colorAdjustEssl from './source/compositor/coloradjust.glsl';
import blurEssl from './source/compositor/blur.glsl';
import lumEssl from './source/compositor/lum.glsl';
import lutEssl from './source/compositor/lut.glsl';
import vigentteEssl from './source/compositor/vignette.glsl';
import outputEssl from './source/compositor/output.glsl';
import brightEssl from './source/compositor/bright.glsl';
import downsampleEssl from './source/compositor/downsample.glsl';
import upsampleEssl from './source/compositor/upsample.glsl';
import hdrEssl from './source/compositor/hdr.glsl';
import lensflareEssl from './source/compositor/lensflare.glsl';
import blendEssl from './source/compositor/blend.glsl';
import fxaaEssl from './source/compositor/fxaa.glsl';
// import fxaa3Essl from './source/compositor/fxaa3.glsl';

// TODO Must export a module and be used in the other modules. Or it will be tree shaked
export default function register(Shader: { import(str: string): void }) {
  // Some build in shaders
  Shader.import(vertexGlsl);
  Shader.import(colorAdjustEssl);
  Shader.import(blurEssl);
  Shader.import(lumEssl);
  Shader.import(lutEssl);
  Shader.import(vigentteEssl);
  Shader.import(outputEssl);
  Shader.import(brightEssl);
  Shader.import(downsampleEssl);
  Shader.import(upsampleEssl);
  Shader.import(hdrEssl);
  Shader.import(lensflareEssl);
  Shader.import(blendEssl);

  Shader.import(fxaaEssl);
}
