import { createUniform, FragmentShader, glsl } from '../../../Shader';

export const depthWriteFragment = new FragmentShader({
  name: 'depthWriteFrag',
  uniforms: {
    depthTex: createUniform('sampler2D')
  },
  main: glsl`
void main() {
  out_color = vec4(1.0);
  vec4 depthTexel = texture(depthTex, v_Texcoord);
  gl_FragDepth = depthTexel.r;
}`
});
