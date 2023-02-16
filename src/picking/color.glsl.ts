import { createUniform, FragmentShader, glsl, VertexShader } from '../Shader';
import { POSITION, WORLDVIEWPROJECTION } from '../shader/source/shared';
import { skinningMixin } from '../shader/source/util.glsl';

export const colorVertex = new VertexShader({
  name: 'colorVertex',
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION()
  },
  attributes: {
    position: POSITION()
  },
  includes: [skinningMixin],
  main: glsl`
void main(){
  vec3 skinnedPosition = position;

  #ifdef SKINNING
  ${skinningMixin.main}
  skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
  #endif

  gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);
}`
});

export const colorFragment = new FragmentShader({
  name: 'colorFrag',
  uniforms: {
    color: createUniform('vec4', [1, 1, 1, 1])
  },
  main: glsl`
void main() {
  out_color = color;
}`
});
