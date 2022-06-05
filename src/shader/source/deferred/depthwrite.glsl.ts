import { createUniform, FragmentShader, glsl } from '../../../Shader';

export const depthWriteFragment = new FragmentShader({
  name: 'depthWriteFrag',
  uniforms: {
    gBufferTexture2: createUniform('sampler2D')
  },
  main: glsl`
void main() {
  gl_FragColor = vec4(1.0);
  vec4 depthTexel = texture2D(gBufferTexture2, v_Texcoord);
  gl_FragDepthEXT = depthTexel.r;
}`
});
