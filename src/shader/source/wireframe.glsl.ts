import {
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createUniform as uniform,
  createVarying as varying,
  FragmentShader,
  glsl,
  VertexShader
} from '../../Shader';
import { POSITION, WORLD, WORLDVIEWPROJECTION } from './shared';
import { floatEncoderMixin, instancingMixin, skinningMixin, wireframeMixin } from './util.glsl';
export const wireframeVertex = new VertexShader({
  name: 'wireframeVertex',
  uniforms: {
    world: WORLD(),
    worldViewProjection: WORLDVIEWPROJECTION()
  },
  attributes: {
    position: POSITION(),
    barycentric: attribute('vec3')
  },
  varyings: {
    v_WorldPosition: varying('vec3'),
    v_Barycentric: varying('vec3')
  },
  includes: [skinningMixin, instancingMixin],
  main: glsl`
void main() {

  vec3 skinnedPosition = position;
#ifdef SKINNING
  ${skinningMixin.main}
  skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif
#ifdef INSTANCING
  ${instancingMixin.main}
  skinnedPosition = instanceMat * skinnedPosition;
#endif
  gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0 );
  v_Barycentric = barycentric;
  }`
});

export const wireframeFragment = new FragmentShader({
  name: 'wireframeFrag',
  uniforms: {
    color: uniform('vec3', [0, 0, 0]),
    alpha: uniform('float', 1),
    lineWidth: uniform('float', 0)
  },
  includes: [floatEncoderMixin, wireframeMixin],
  main: glsl`
void main() {
  out_color.rgb = color;
  out_color.a = (1.0-edgeFactor(lineWidth)) * alpha;
}`
});
