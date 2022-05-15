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
import { POSITION, TEXCOORD_0, WORLDVIEWPROJECTION } from './shared';
import {
  instancingMixin,
  logDepthFragmentMixin,
  logDepthVertexMixin,
  skinningMixin
} from './util.glsl';
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
    WVP: WORLDVIEWPROJECTION(),
    uvRepeat: uniform('vec2', [1, 1]),
    uvOffset: uniform('vec2', [0, 0])
  },
  attributes: {
    pos: POSITION(),
    uv: TEXCOORD_0()
  },
  includes: [skinningMixin, logDepthVertexMixin, instancingMixin],

  main: glsl`
void main() {
  vec4 P = vec4(pos, 1.0);

#ifdef SKINNING
  ${skinningMixin.main}
  P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
  ${instancingMixin.main}
  P = instanceMat * P;
#endif
  gl_Position = WVP * P;
  v_Texcoord = uv * uvRepeat + uvOffset;

  ${logDepthVertexMixin.main}
}`
});

/**
 * Prez fragment shader
 */
export const preZFragment = new FragmentShader({
  uniforms: {
    alphaMap: uniform('sampler2D'),
    alphaCutoff: uniform('float', 0),
    ...logDepthFragmentMixin.uniforms
  },
  // Varyings will be shared from vertex
  main: glsl`
void main() {
  if (alphaCutoff > 0.0) {
    if (texture2D(alphaMap, v_Texcoord).a <= alphaCutoff) {
      discard;
    }
  }
  gl_FragColor = vec4(0.0,0.0,0.0,1.0);

  ${logDepthFragmentMixin.main}
}`
});
