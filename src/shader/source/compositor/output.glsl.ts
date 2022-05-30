import { createUniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const outputFragment = new FragmentShader({
  name: 'outputFrag',
  defines: {
    OUTPUT_ALPHA: null
  },
  uniforms: {
    texture: createUniform('sampler2D')
  },
  includes: [HDREncoderMixin],
  main: glsl`
void main() {
  vec4 tex = decodeHDR(texture2D(texture, v_Texcoord));

#if !defined(OUTPUT_ALPHA)
  tex.a = 1.0;
#endif

  tex = encodeHDR(tex);
#ifdef PREMULTIPLY_ALPHA
  tex.rgb *= tex.a;
#endif
  gl_FragColor = tex;
}
  `
});
