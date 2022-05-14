// Shader for prez pass

import {
  VertexShader,
  glsl,
  createVarying as varying,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  createAttribute as attribute,
  FragmentShader
} from '../../Shader';
import { instancing, logDepthFragment, logDepthVertex, skinning } from './util.glsl';
/**
 * Prez vertex shader
 */
export const preZVertex = new VertexShader({
  defines: {
    SHADER_NAME: 'prez'
  },
  varyings: {
    v_Texcoord: varying('vec2')
  },
  uniforms: {
    WVP: semanticUniform('mat4', 'WORLDVIEWPROJECTION'),
    uvRepeat: uniform('vec2', [1, 1]),
    uvOffset: uniform('vec2', [0, 0])
  },
  attributes: {
    pos: attribute('vec3', 'POSITION'),
    uv: attribute('vec2', 'TEXCOORD_0')
  },
  includes: [skinning, logDepthVertex, instancing],

  code: glsl`
${skinning.code.header}
${instancing.code}
${logDepthVertex.code}

void main() {
  vec4 P = vec4(pos, 1.0);

#ifdef SKINNING
  skinm
  @import clay.chunk.skin_matrix
  P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
  @import clay.chunk.instancing_matrix
  P = instanceMat * P;
#endif
  gl_Position = WVP * P;
  v_Texcoord = uv * uvRepeat + uvOffset;

  @import clay.util.logdepth_vertex_main
}`
});

/**
 * Prez fragment shader
 */
export const preZFragment = new FragmentShader({
  uniforms: {
    alphaMap: uniform('sampler2D'),
    alphaCutoff: uniform('float', 0),
    ...logDepthFragment.uniforms
  },
  // Varyings will be shared from vertex
  code: glsl`
void main() {
  if (alphaCutoff > 0.0) {
    if (texture2D(alphaMap, v_Texcoord).a <= alphaCutoff) {
      discard;
    }
  }
  gl_FragColor = vec4(0.0,0.0,0.0,1.0);

  ${logDepthFragment.code}
}`
});
