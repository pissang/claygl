import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const brightCompositeFragment = new FragmentShader({
  name: 'brightFrag',
  uniforms: {
    colorTex: uniform('sampler2D'),

    threshold: uniform('float', 1),
    scale: uniform('float', 1.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
const vec3 lumWeight = vec3(0.2125, 0.7154, 0.0721);

// 3-tap median filter
vec4 median(vec4 a, vec4 b, vec4 c) {
  return a + b + c - min(min(a, b), c) - max(max(a, b), c);
}

void main() {
  vec4 texel = decodeHDR(texture(colorTex, v_Texcoord));

#ifdef ANTI_FLICKER
  vec2 size = vec2(textureSize(colorTex, 0));
  // Use median filter to reduce noise
  // https://github.com/keijiro/KinoBloom/blob/master/Assets/Kino/Bloom/Shader/Bloom.cginc#L96
  vec3 d = 1.0 / size.xyx * vec3(1.0, 1.0, 0.0);

  vec4 s1 = decodeHDR(texture(colorTex, v_Texcoord - d.xz));
  vec4 s2 = decodeHDR(texture(colorTex, v_Texcoord + d.xz));
  vec4 s3 = decodeHDR(texture(colorTex, v_Texcoord - d.zy));
  vec4 s4 = decodeHDR(texture(colorTex, v_Texcoord + d.zy));
  texel = median(median(texel, s1, s2), s3, s4);

#endif
  // Premultiplied Alpha
  float lum = dot(texel.rgb , lumWeight);
  vec4 color;
  if (lum > threshold && texel.a > 0.0) {
    color = vec4(texel.rgb * scale, texel.a * scale);
  }
  else {
    color = vec4(0.0);
  }

  out_color = encodeHDR(color);
}
  `
});
