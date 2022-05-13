// Shader for prez pass

import {
  VertexShader,
  glsl,
  createVarying,
  createUniform,
  createSemanticUniform,
  createAttribute,
  FragmentShader
} from '../../Shader';
import { instancing, logDepthFragment, logDepthVertex, skinning } from './util.glsl';

export const preZVertex = new VertexShader({
  defines: {
    SHADER_NAME: 'prez'
  },
  varyings: {
    v_Texcoord: createVarying('vec2'),
    ...logDepthVertex.varyings
  },
  uniforms: {
    WVP: createSemanticUniform('mat4', 'WORLDVIEWPROJECTION'),
    uvRepeat: createUniform('vec2', [1, 1]),
    uvOffset: createUniform('vec2', [0, 0]),
    ...skinning.uniforms,
    ...logDepthFragment.uniforms
  },
  attributes: {
    pos: createAttribute('vec3', 'POSITION'),
    uv: createAttribute('vec2', 'TEXCOORD_0'),
    ...skinning.attributes,
    ...instancing.attributes
  },
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

export const preZFragment = new FragmentShader({
  uniforms: {
    alphaMap: createUniform('sampler2D'),
    alphaCutoff: createUniform('float', 0),
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
