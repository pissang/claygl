import {
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createUniform as uniform,
  createVarying as varying,
  FragmentShader,
  glsl,
  VertexShader
} from '../../Shader';
import { POSITION } from './shared';
import { ACESToneMappingFunction, HDREncoderMixin, sRGBMixin } from './util.glsl';
export const skyboxVertex = new VertexShader({
  name: 'skyboxVertex',
  uniforms: {
    view: semanticUniform('mat4', 'VIEW'),
    projection: semanticUniform('mat4', 'PROJECTION')
  },
  attributes: {
    position: POSITION()
  },
  varyings: {
    v_WorldPosition: varying('vec3')
  },
  main: glsl`
void main() {
  v_WorldPosition = position;
  mat3 m = mat3(view);
  m[0] = normalize(m[0]);
  m[1] = normalize(m[1]);
  m[2] = normalize(m[2]);
  gl_Position = projection * mat4(m) * vec4(position, 1.0);
}`
});

export const skyboxFragment = new FragmentShader({
  name: 'skyboxFrag',
  defines: {
    PI: Math.PI
  },
  uniforms: {
    equirectangularMap: uniform('sampler2D'),
    cubeMap: uniform('samplerCube'),
    lod: uniform('float', 0)
  },
  includes: [HDREncoderMixin, sRGBMixin],
  main: glsl`
${ACESToneMappingFunction()}

void main()
{
  vec3 V = normalize(v_WorldPosition);
#ifdef EQUIRECTANGULAR
  float phi = acos(V.y);
  // consistent with cubemap.
  // atan(y, x) is same with atan2 ?
  float theta = atan(-V.x, V.z) + PI * 0.5;
  vec2 uv = vec2(theta / 2.0 / PI, phi / PI);
  vec4 texel = decodeHDR(texture(equirectangularMap, fract(uv)));
#else
  vec4 texel = decodeHDR(textureLod(cubeMap, V, lod));
#endif

#ifdef SRGB_DECODE
  texel = sRGBToLinear(texel);
#endif

#ifdef TONEMAPPING
  texel.rgb = ACESToneMapping(texel.rgb);
#endif

#ifdef SRGB_ENCODE
  texel = linearTosRGB(texel);
#endif

  out_color = encodeHDR(vec4(texel.rgb, 1.0));

#ifdef SUPPORT_FRAG_DEPTH
  // PENDING 1.0 - 1e-6 will be smaller than the depth texture precision.
  gl_FragDepthEXT = 1.0 - 1e-5;
#endif
}`
});
