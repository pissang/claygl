import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl,
  createArrayUniform as arrayUniform
} from '../../../Shader';

export const deferredAmbientSHLightFragment = new FragmentShader({
  name: 'deferredAmbientSHFrag',
  uniforms: {
    gBufferTexture1: uniform('sampler2D'),
    gBufferTexture3: uniform('sampler2D'),
    lightColor: uniform('vec3'),
    lightCoefficients: arrayUniform('vec3', 9),
    windowSize: semanticUniform('vec2', 'WINDOW_SIZE')
  },
  main: glsl`

vec3 calcAmbientSHLight(vec3 N) {
  // FIXME Index expression must be constant
  return lightCoefficients[0]
    + lightCoefficients[1] * N.x
    + lightCoefficients[2] * N.y
    + lightCoefficients[3] * N.z
    + lightCoefficients[4] * N.x * N.z
    + lightCoefficients[5] * N.z * N.y
    + lightCoefficients[6] * N.y * N.x
    + lightCoefficients[7] * (3.0 * N.z * N.z - 1.0)
    + lightCoefficients[8] * (N.x * N.x - N.y * N.y);
}

void main()
{
  vec2 uv = gl_FragCoord.xy / windowSize;

  vec4 texel1 = texture2D(gBufferTexture1, uv);
  // Is empty
  if (dot(texel1.rgb, vec3(1.0)) == 0.0) {
    discard;
  }
  vec3 N = texel1.rgb * 2.0 - 1.0;
  vec3 albedo = texture2D(gBufferTexture3, uv).rgb;
  gl_FragColor.rgb = lightColor * albedo * calcAmbientSHLight(N);
  gl_FragColor.a = 1.0;
}`
});
