import {
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createUniform as uniform,
  createVarying as varying,
  FragmentShader,
  glsl,
  VertexShader
} from '../../Shader';
import { POSITION, VIEWINVERSE, WORLD, WORLDVIEWPROJECTION } from './shared';
import {
  ACESToneMappingFunction,
  decodeRGBMFunction,
  encodeRGBMFunction,
  linearToSRGBFunction,
  sRGBToLinearFunction
} from './util.glsl';
export const skyboxVertex = new VertexShader({
  uniforms: {
    world: WORLD(),
    worldViewProjection: WORLDVIEWPROJECTION()
  },
  attributes: {
    position: POSITION()
  },
  varyings: {
    v_WorldPosition: varying('vec3')
  },
  main: glsl`
void main() {
  v_WorldPosition = (world * vec4(position, 1.0)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`
});

export const skyboxFragment = new FragmentShader({
  uniforms: {
    viewInverse: VIEWINVERSE(),
    equirectangularMap: uniform('sampler2D'),
    cubeMap: uniform('samplerCube'),
    lod: uniform('float', 0)
  },
  main: glsl`
${encodeRGBMFunction()}
${decodeRGBMFunction()}
${sRGBToLinearFunction()}
${linearToSRGBFunction()}
${ACESToneMappingFunction()}

void main()
{
  vec3 eyePos = viewInverse[3].xyz;
  vec3 V = normalize(v_WorldPosition - eyePos);
#ifdef EQUIRECTANGULAR
  float phi = acos(V.y);
  // consistent with cubemap.
  // atan(y, x) is same with atan2 ?
  float theta = atan(-V.x, V.z) + PI * 0.5;
  vec2 uv = vec2(theta / 2.0 / PI, phi / PI);
  vec4 texel = decodeHDR(texture2D(equirectangularMap, fract(uv)));
#else
  #if defined(LOD) || defined(SUPPORT_TEXTURE_LOD)
  vec4 texel = decodeHDR(textureCubeLodEXT(cubeMap, V, lod));
  #else
  vec4 texel = decodeHDR(textureCube(cubeMap, V));
  #endif
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

  gl_FragColor = encodeHDR(vec4(texel.rgb, 1.0));
}`
});
