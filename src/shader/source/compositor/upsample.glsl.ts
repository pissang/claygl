import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const upsampleCompositeFragemnt = new FragmentShader({
  name: 'upsampleFrag',
  defines: {
    HIGH_QUALITY: null
  },
  uniforms: {
    texture: uniform('sampler2D'),
    textureSize: uniform('vec2', [512, 512]),
    sampleScale: uniform('float', 0.5)
  },
  includes: [HDREncoderMixin],
  main: glsl`
void main() {
#ifdef HIGH_QUALITY
  // 9-tap bilinear upsampler (tent filter)
  vec4 d = vec4(1.0, 1.0, -1.0, 0.0) / textureSize.xyxy * sampleScale;

  vec4 s;
  s  = decodeHDR(clampSample(texture, v_Texcoord - d.xy));
  s += decodeHDR(clampSample(texture, v_Texcoord - d.wy)) * 2.0;
  s += decodeHDR(clampSample(texture, v_Texcoord - d.zy));

  s += decodeHDR(clampSample(texture, v_Texcoord + d.zw)) * 2.0;
  s += decodeHDR(clampSample(texture, v_Texcoord       )) * 4.0;
  s += decodeHDR(clampSample(texture, v_Texcoord + d.xw)) * 2.0;

  s += decodeHDR(clampSample(texture, v_Texcoord + d.zy));
  s += decodeHDR(clampSample(texture, v_Texcoord + d.wy)) * 2.0;
  s += decodeHDR(clampSample(texture, v_Texcoord + d.xy));

  out_color = encodeHDR(s / 16.0);
#else
  // 4-tap bilinear upsampler
  vec4 d = vec4(-1.0, -1.0, +1.0, +1.0) / textureSize.xyxy;

  vec4 s;
  s  = decodeHDR(clampSample(texture, v_Texcoord + d.xy));
  s += decodeHDR(clampSample(texture, v_Texcoord + d.zy));
  s += decodeHDR(clampSample(texture, v_Texcoord + d.xw));
  s += decodeHDR(clampSample(texture, v_Texcoord + d.zw));

  out_color = encodeHDR(s / 4.0);
#endif
}
  `
});
