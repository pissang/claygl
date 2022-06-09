import {
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createUniform as uniform,
  createVarying as varying,
  FragmentShader,
  glsl,
  VertexShader
} from '../../Shader';
import { POSITION, TEXCOORD_0, WORLDVIEWPROJECTION } from './shared';
import {
  ACESToneMappingFunction,
  instancingMixin,
  logDepthFragmentMixin,
  logDepthVertexMixin,
  HDREncoderMixin,
  skinningMixin,
  sRGBMixin,
  wireframeMixin
} from './util.glsl';

export const sharedBasicVertexAttributes = {
  position: POSITION(),
  texcoord: TEXCOORD_0(),
  barycentric: attribute('vec3'),
  a_Color: attribute('vec4', 'COLOR')
};

export const unlitVertex = new VertexShader({
  name: 'unlitVertex',
  attributes: {
    ...sharedBasicVertexAttributes
  },
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION(),
    uvRepeat: uniform('vec2', [1, 1]),
    uvOffset: uniform('vec2', [0, 0])
  },
  varyings: {
    v_Texcoord: varying('vec2'),
    v_Barycentric: varying('vec3'),
    v_Color: varying('vec4')
  },
  includes: [skinningMixin, instancingMixin, logDepthVertexMixin, skinningMixin],

  main: glsl`
void main()
{
  vec4 skinnedPosition = vec4(position, 1.0);

#ifdef SKINNING
  ${skinningMixin.main}
  skinnedPosition = skinMatrixWS * skinnedPosition;
#endif

#ifdef INSTANCING
  ${instancingMixin.main}
  skinnedPosition = instanceMat * skinnedPosition;
#endif

  v_Texcoord = texcoord * uvRepeat + uvOffset;
  v_Barycentric = barycentric;

  gl_Position = worldViewProjection * skinnedPosition;

#ifdef VERTEX_COLOR
  v_Color = a_Color;
#endif

  ${logDepthVertexMixin.main}
}`
});

export const sharedBasicFragmentUniforms = {
  diffuseMap: uniform('sampler2D'),
  color: uniform('rgb', [1, 1, 1]),
  emission: uniform('vec3', [0, 0, 0]),
  alpha: uniform('float', 1),
  alphaCutoff: uniform('float', 0.9),
  lineWidth: uniform('float', 0),
  lineColor: uniform('rgba', [0, 0, 0, 0.6])
};

export const unlitFragment = new FragmentShader({
  name: 'unlitFrag',
  defines: {
    DIFFUSEMAP_ALPHA_ALPHA: null
  },
  uniforms: {
    ...sharedBasicFragmentUniforms
  },

  includes: [wireframeMixin, HDREncoderMixin, sRGBMixin],

  main: glsl`

${ACESToneMappingFunction()}

void main() {
  gl_FragColor = vec4(color, alpha);
#ifdef VERTEX_COLOR
  gl_FragColor *= v_Color;
#endif

#ifdef SRGB_DECODE
  gl_FragColor = sRGBToLinear(gl_FragColor);
#endif

#ifdef DIFFUSEMAP_ENABLED
  vec4 texel = decodeHDR(texture2D(diffuseMap, v_Texcoord));

  #ifdef SRGB_DECODE
  texel = sRGBToLinear(texel);
  #endif

  #if defined(DIFFUSEMAP_ALPHA_ALPHA)
  gl_FragColor.a = texel.a;
  #endif

  gl_FragColor.rgb *= texel.rgb;

#endif

  gl_FragColor.rgb += emission;
  if (lineWidth > 0.) {
    gl_FragColor.rgb = mix(gl_FragColor.rgb, lineColor.rgb, (1.0 - edgeFactor(lineWidth)) * lineColor.a);
  }

#ifdef ALPHA_TEST
  if (gl_FragColor.a < alphaCutoff) {
    discard;
  }
#endif

#ifdef TONEMAPPING
  gl_FragColor.rgb = ACESToneMapping(gl_FragColor.rgb);
#endif
#ifdef SRGB_ENCODE
  gl_FragColor = linearTosRGB(gl_FragColor);
#endif

  gl_FragColor = encodeHDR(gl_FragColor);

  ${logDepthFragmentMixin.main}
}
  `
});