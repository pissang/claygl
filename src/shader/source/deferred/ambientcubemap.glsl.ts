import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl
} from '../../../Shader';
import { encodeRGBMFunction } from '../util.glsl';
import { gBufferReadMixin } from './chunk.glsl';

export const ambientCubemapLightFragment = new FragmentShader({
  uniforms: {
    lightColor: uniform('vec3'),
    lightCubemap: uniform('samplerCube'),
    brdfLookup: uniform('sampler2D'),

    eyePosition: uniform('vec3')
  },
  includes: [gBufferReadMixin],
  main: glsl`
${encodeRGBMFunction()}

void main()
{
  ${gBufferReadMixin.main}

  vec3 V = normalize(eyePosition - position);
  vec3 L = reflect(-V, N);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float rough = clamp(1.0 - glossiness, 0.0, 1.0);
  // FIXME fixed maxMipmapLevel ?
  float bias = rough * 5.0;
  // One brdf lookup is enough
  vec2 brdfParam = texture2D(brdfLookup, vec2(rough, ndv)).xy;
  vec3 envWeight = specularColor * brdfParam.x + brdfParam.y;

  vec3 envTexel = RGBMDecode(textureCubeLodEXT(lightCubemap, L, bias), 8.12);
  // TODO mix ?
  gl_FragColor.rgb = lightColor * envTexel * envWeight;

  gl_FragColor.a = 1.0;
}`
});
