// Split view for debugger
import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const splitViewCompositeFragment = new FragmentShader({
  name: 'splitViewFrag',
  defines: {
    /**
     * 0 horizontal
     * 1 vertical
     */
    DIRECTION: 0
  },
  uniforms: {
    texture1: uniform('sampler2D'),
    percent1: uniform('float', 0.2),
    texture2: uniform('sampler2D'),
    percent2: uniform('float', 0.4),
    texture3: uniform('sampler2D'),
    percent3: uniform('float', 0.6),
    texture4: uniform('sampler2D'),
    percent4: uniform('float', 0.8),
    texture5: uniform('sampler2D'),
    percent5: uniform('float', 1.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
vec4 blend(sampler2D texture, float start, float end) {
  vec4 col = decodeHDR(texture(texture, v_Texcoord));
#if DIRECTION == 1
  float p = uv.y;
#else
  float p = uv.x;
#endif
  if (p <= end && p >= start) {
    return col;
  }
  return vec4(0.0);
}

void main() {
  vec4 tex = vec4(0.0);
#ifdef TEXTURE1_ENABLED
  tex += blend(texture1, 0.0, percent1);
#endif
#ifdef TEXTURE2_ENABLED
  tex += blend(texture2, percent1, percent2);
#endif
#ifdef TEXTURE3_ENABLED
  tex += blend(texture3, percent2, percent3);
#endif
#ifdef TEXTURE4_ENABLED
  tex += blend(texture4, percent3, percent4);
#endif
#ifdef TEXTURE5_ENABLED
  tex += blend(texture5, percent4, percent5);
#endif
#ifdef TEXTURE6_ENABLED
  tex += blend(texture6, percent5, percent6);
#endif
  out_color = encodeHDR(tex);
}
`
});
