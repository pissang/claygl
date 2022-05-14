import {
  VertexShader,
  createUniform as uniform,
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createVarying as varying
} from '../../Shader';

const m4 = 'mat4' as const;
export function WORLDVIEWPROJECTION() {
  return semanticUniform(m4, 'WORLDVIEWPROJECTION');
}
export function WORLDINVERSETRANSPOSE() {
  return semanticUniform(m4, 'WORLDINVERSETRANSPOSE');
}
export function WORLD() {
  return semanticUniform(m4, 'WORLD');
}
export function VIEWINVERSE() {
  return semanticUniform(m4, 'VIEWINVERSE');
}
export function POSITION() {
  return attribute('vec3', 'POSITION');
}
export function TEXCOORD_0() {
  return attribute('vec2', 'TEXCOORD_0');
}
export function NORMAL() {
  return attribute('vec3', 'NORMAL');
}
export function TANGENT() {
  return attribute('vec4', 'TANGENT');
}
