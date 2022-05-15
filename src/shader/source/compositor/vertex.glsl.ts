import {
  createAttribute,
  createSemanticUniform,
  createVarying,
  glsl,
  VertexShader
} from '../../../Shader';

export const fullscreenQuadPassVertex = new VertexShader({
  name: 'fullQuadVertex',
  uniforms: {
    WVP: createSemanticUniform('mat4', 'WORLDVIEWPROJECTION')
  },
  attributes: {
    pos: createAttribute('vec3', 'POSITION'),
    uv: createAttribute('vec2', 'TEXCOORD_0')
  },
  varyings: {
    v_Texcoord: createVarying('vec2')
  },
  main: glsl`
void main() {
  v_Texcoord = uv;
  gl_Position = WVP * vec4(pos, 1.0);
}
  `
});
