import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl
} from '../../../Shader';
import { decodeRGBMFunction } from '../util.glsl';
import { gBufferReadMixin } from './chunk.glsl';

export const deferredAmbientCubemapLightFragment = new FragmentShader({
  name: 'deferredAmbientCubemapFrag',
  uniforms: {
    lightColor: uniform('vec3'),
    lightCubemap: uniform('samplerCube'),
    brdfLookup: uniform('sampler2D'),

    eyePosition: uniform('vec3')
  },
  includes: [gBufferReadMixin],
  main: glsl`
${decodeRGBMFunction()}

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
  vec2 brdfParam = texture(brdfLookup, vec2(rough, ndv)).xy;
  vec3 envWeight = specularColor * brdfParam.x + brdfParam.y;

  vec3 envTexel = decodeRGBM(texture(lightCubemap, L, bias), 8.12);
  // TODO mix ?
  out_color.rgb = lightColor * envTexel * envWeight;

  out_color.a = 1.0;
}`
});
