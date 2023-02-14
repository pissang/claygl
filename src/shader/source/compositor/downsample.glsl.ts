import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { clampSampleFunction, HDREncoderMixin } from '../util.glsl';

export const downsampleCompositeFragment = new FragmentShader({
  name: 'downSampleFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    textureSize: uniform('vec2', [512, 512])
  },
  includes: [HDREncoderMixin],
  main: glsl`
${clampSampleFunction()}
float brightness(vec3 c) {
  return max(max(c.r, c.g), c.b);
}
void main() {
  vec4 d = vec4(-1.0, -1.0, 1.0, 1.0) / textureSize.xyxy;

#ifdef ANTI_FLICKER
  // https://github.com/keijiro/KinoBloom/blob/master/Assets/Kino/Bloom/Shader/Bloom.cginc#L96
  // TODO
  vec3 s1 = decodeHDR(clampSample(texture, v_Texcoord + d.xy)).rgb;
  vec3 s2 = decodeHDR(clampSample(texture, v_Texcoord + d.zy)).rgb;
  vec3 s3 = decodeHDR(clampSample(texture, v_Texcoord + d.xw)).rgb;
  vec3 s4 = decodeHDR(clampSample(texture, v_Texcoord + d.zw)).rgb;

  // Karis's luma weighted average (using brightness instead of luma)
  float s1w = 1.0 / (brightness(s1) + 1.0);
  float s2w = 1.0 / (brightness(s2) + 1.0);
  float s3w = 1.0 / (brightness(s3) + 1.0);
  float s4w = 1.0 / (brightness(s4) + 1.0);
  float oneDivideSum = 1.0 / (s1w + s2w + s3w + s4w);

  vec4 color = vec4(
    (s1 * s1w + s2 * s2w + s3 * s3w + s4 * s4w) * oneDivideSum,
    1.0
  );
#else
  vec4 color = decodeHDR(clampSample(texture, v_Texcoord + d.xy));
  color += decodeHDR(clampSample(texture, v_Texcoord + d.zy));
  color += decodeHDR(clampSample(texture, v_Texcoord + d.xw));
  color += decodeHDR(clampSample(texture, v_Texcoord + d.zw));
  color *= 0.25;
#endif

  out_color = encodeHDR(color);
}`
});
