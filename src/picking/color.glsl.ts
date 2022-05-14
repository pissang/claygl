import { createUniform, FragmentShader, glsl, VertexShader } from '../Shader';
import { POSITION, WORLDVIEWPROJECTION } from '../shader/source/shared';
import { skinning } from '../shader/source/util.glsl';

export const colorVertex = new VertexShader({
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION()
  },
  attributes: {
    position: POSITION()
  },
  includes: [skinning],
  main: glsl`
void main(){
  vec3 skinnedPosition = position;

  #ifdef SKINNING
  ${skinning.main}
  skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
  #endif

  gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);
}`
});

export const colorFragment = new FragmentShader({
  uniforms: {
    color: createUniform('rgba', [1, 1, 1, 1])
  },
  main: glsl`
void main() {
  gl_FragColor = color;
}`
});
