import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl
} from '../../../Shader';

export const ambientLightFragment = new FragmentShader({
  uniforms: {
    gBufferTexture1: uniform('sampler2D'),
    gBufferTexture3: uniform('sampler2D'),
    lightColor: uniform('vec3'),
    windowSize: semanticUniform('vec2', 'WINDOW_SIZE')
  },
  main: glsl`
void main()
{
  vec2 uv = gl_FragCoord.xy / windowSize;

  vec4 texel1 = texture2D(gBufferTexture1, uv);
  // Is empty
  if (dot(texel1.rgb, vec3(1.0)) == 0.0) {
    discard;
  }

  vec3 albedo = texture2D(gBufferTexture3, uv).rgb;
  gl_FragColor.rgb = lightColor * albedo;
  gl_FragColor.a = 1.0;
}`
});
