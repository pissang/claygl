import { createUniform, createVarying, FragmentShader, glsl, VertexShader } from '../Shader';
import { POSITION, TEXCOORD_0 } from '../shader/source/shared';

export const VRDistorterVertex = new VertexShader({
  attributes: {
    position: POSITION(),
    texcoord: TEXCOORD_0()
  },
  varyings: {
    v_Texcoord: createVarying('vec2')
  },
  main: glsl`
void main() {
  v_Texcoord = texcoord;
  gl_Position = vec4(position.xy, 0.5, 1.0);
}`
});

export const VRDistorterFragment = new FragmentShader({
  uniforms: {
    texture: createUniform('sampler2D')
  },
  main: glsl`
void main() {
  gl_FragColor = texture2D(texture, v_Texcoord);
}`
});
