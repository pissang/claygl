import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const blendCompositeFragment = new FragmentShader({
  name: 'blendFrag',
  defines: {
    /**
     * 0 ADD
     * 1 MULTIPLY
     */
    BLEND_METHOD: 0
  },
  uniforms: {
    colorTex1: uniform('sampler2D'),
    weight1: uniform('float', 1.0),
    colorTex2: uniform('sampler2D'),
    weight2: uniform('float', 1.0),
    colorTex3: uniform('sampler2D'),
    weight3: uniform('float', 1.0),
    colorTex4: uniform('sampler2D'),
    weight4: uniform('float', 1.0),
    colorTex5: uniform('sampler2D'),
    weight5: uniform('float', 1.0),
    colorTex6: uniform('sampler2D'),
    weight6: uniform('float', 1.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
vec4 blend(vec4 col1, vec4 col2, float w) {
#if BLEND_METHOD == 1
  return vec4(col1.rgb * col2.rgb * w, max(col1.a, col2.a));
#else
  return col1 + col2 * w;
#endif
}
void main() {
#if BLEND_METHOD == 1
  vec4 tex = vec4(1.0);
#else
  vec4 tex = vec4(0.0);
#endif
#ifdef COLORTEX1_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex1, v_Texcoord)), weight1);
#endif
#ifdef COLORTEX2_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex2, v_Texcoord)), weight2);
#endif
#ifdef COLORTEX3_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex3, v_Texcoord)), weight3);
#endif
#ifdef COLORTEX4_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex4, v_Texcoord)), weight4);
#endif
#ifdef COLORTEX5_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex5, v_Texcoord)), weight5);
#endif
#ifdef COLORTEX6_ENABLED
  tex = blend(tex, decodeHDR(texture(colorTex6, v_Texcoord)), weight6);
#endif
  out_color = encodeHDR(tex);
}
`
});
