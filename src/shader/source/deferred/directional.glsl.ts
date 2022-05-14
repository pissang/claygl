import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl,
  createArrayUniform as arrayUniform
} from '../../../Shader';
import { shadowMap } from '../shadowmap.glsl';
import { gBufferRead, lightEquationFunction } from './chunk.glsl';

export const directionalLightFragment = new FragmentShader({
  uniforms: {
    lightDirection: uniform('vec3'),
    lightColor: uniform('vec3'),
    eyePosition: uniform('vec3'),
    lightShadowMap: uniform('sampler2D'),
    lightShadowMapSize: uniform('float'),
    lightMatrices: arrayUniform('mat4', 'SHADOW_CASCADE'),
    shadowCascadeClipsNear: arrayUniform('float', 'SHADOW_CASCADE'),
    shadowCascadeClipsFar: arrayUniform('float', 'SHADOW_CASCADE')
  },
  includes: [shadowMap, gBufferRead],
  main: glsl`

${lightEquationFunction()}

void main()
{
  ${gBufferRead.main}

  vec3 L = -normalize(lightDirection);
  vec3 V = normalize(eyePosition - position);

  vec3 H = normalize(L + V);
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float ndh = clamp(dot(N, H), 0.0, 1.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  gl_FragColor.rgb = lightEquation(
    lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
  );

#ifdef SHADOWMAP_ENABLED
  float shadowContrib = 1.0;
  for (int _idx_ = 0; _idx_ < SHADOW_CASCADE; _idx_++) {{
    if (
      z >= shadowCascadeClipsNear[_idx_] &&
      z <= shadowCascadeClipsFar[_idx_]
    ) {
      shadowContrib = computeShadowContrib(
        lightShadowMap, lightMatrices[_idx_], position, lightShadowMapSize,
        vec2(1.0 / float(SHADOW_CASCADE), 1.0),
        vec2(float(_idx_) / float(SHADOW_CASCADE), 0.0)
      );
    }
  }}

  gl_FragColor.rgb *= shadowContrib;
#endif

  gl_FragColor.a = 1.0;
}`
});
