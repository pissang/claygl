import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { decodeHDRFunction, encodeHDRFunction } from '../util.glsl';

export const blendCompositeFragment = new FragmentShader({
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
  main: glsl`

${encodeHDRFunction()}
${decodeHDRFunction()}

void main()
{
  vec4 tex = vec4(0.0);
#ifdef TEXTURE1_ENABLED
  tex += decodeHDR(texture2D(texture1, v_Texcoord)) * weight1;
#endif
#ifdef TEXTURE2_ENABLED
  tex += decodeHDR(texture2D(texture2, v_Texcoord)) * weight2;
#endif
#ifdef TEXTURE3_ENABLED
  tex += decodeHDR(texture2D(texture3, v_Texcoord)) * weight3;
#endif
#ifdef TEXTURE4_ENABLED
  tex += decodeHDR(texture2D(texture4, v_Texcoord)) * weight4;
#endif
#ifdef TEXTURE5_ENABLED
  tex += decodeHDR(texture2D(texture5, v_Texcoord)) * weight5;
#endif
#ifdef TEXTURE6_ENABLED
  tex += decodeHDR(texture2D(texture6, v_Texcoord)) * weight6;
#endif
  gl_FragColor = encodeHDR(tex);
}
`
});
