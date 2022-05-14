import { createUniform, FragmentShader, glsl } from '../../../Shader';
import { decodeHDRFunction, encodeHDRFunction } from '../util.glsl';

export const outputFragment = new FragmentShader({
  defines: {
    OUTPUT_ALPHA: null
  },
  uniforms: {
    texture: createUniform('sampler2D')
  },
  main: glsl`
${encodeHDRFunction()}
${decodeHDRFunction()}
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
