import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const blendCompositeFragment = new FragmentShader({
  defines: {
    /**
     * 0 ADD
     * 1 MULTIPLY
     */
    BLEND_METHOD: 0
  },
  name: 'blendFrag',
  uniforms: {
    texture1: uniform('sampler2D'),
    weight1: uniform('float', 1.0),
    texture2: uniform('sampler2D'),
    weight2: uniform('float', 1.0),
    texture3: uniform('sampler2D'),
    weight3: uniform('float', 1.0),
    texture4: uniform('sampler2D'),
    weight4: uniform('float', 1.0),
    texture5: uniform('sampler2D'),
    weight5: uniform('float', 1.0),
    texture6: uniform('sampler2D'),
    weight6: uniform('float', 1.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`

vec4 blend(vec4 col1, vec4 col2, float w) {
#if BLEND_METHOD == 1
  return col1 * col2 * w;
#else
  return col1 + col2 * w;
#endif
}
void main()
{
#if BLEND_METHOD == 1
  vec4 tex = vec4(1.0);
#else
  vec4 tex = vec4(0.0);
#endif
#ifdef TEXTURE1_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture1, v_Texcoord)), weight1);
#endif
#ifdef TEXTURE2_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture2, v_Texcoord)), weight2);
#endif
#ifdef TEXTURE3_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture3, v_Texcoord)), weight3);
#endif
#ifdef TEXTURE4_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture4, v_Texcoord)), weight4);
#endif
#ifdef TEXTURE5_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture5, v_Texcoord)), weight5);
#endif
#ifdef TEXTURE6_ENABLED
  tex = blend(tex, decodeHDR(texture2D(texture6, v_Texcoord)), weight6);
#endif
  gl_FragColor = encodeHDR(tex);
}
`
});
