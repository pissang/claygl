import { createVarying, glsl, VertexShader } from '../../../Shader';
import { POSITION, WORLDVIEWPROJECTION } from '../shared';

export const lightVolumeVertex = new VertexShader({
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION()
  },
  attributes: {
    position: POSITION()
  },
  varyings: {
    v_Position: createVarying('vec3')
  },
  main: glsl`
void main() {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  v_Position = position;
}`
});
