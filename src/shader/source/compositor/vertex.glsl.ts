import { createAttribute, createVarying, glsl, VertexShader } from '../../../Shader';

export const fullscreenQuadPassVertex = new VertexShader({
  name: 'fullQuadVertex',
  attributes: {
    pos: createAttribute('vec3', 'POSITION')
  },
  varyings: {
    v_Texcoord: createVarying('vec2')
  },
  main: glsl`
void main() {
  v_Texcoord = pos.xy * 0.5 + 0.5;
  gl_Position = vec4(pos, 1.0);
}
  `
});
