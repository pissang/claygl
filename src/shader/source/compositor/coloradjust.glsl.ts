import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';

export const colorAdjustCompositeFragment = new FragmentShader({
  name: 'colorAdjustFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    brightness: uniform('float', 0.0),
    contrast: uniform('float', 1.0),
    exposure: uniform('float', 0.0),
    gamma: uniform('float', 1.0),
    saturation: uniform('float', 1.0)
  },
  main: glsl`
// Values from "Graphics Shaders: Theory and Practice" by Bailey and Cunningham
const vec3 w = vec3(0.2125, 0.7154, 0.0721);
void main() {
  vec4 tex = texture2D( texture, v_Texcoord);

  // brightness
  vec3 color = clamp(tex.rgb + vec3(brightness), 0.0, 1.0);
  // contrast
  color = clamp( (color-vec3(0.5))*contrast+vec3(0.5), 0.0, 1.0);
  // exposure
  color = clamp( color * pow(2.0, exposure), 0.0, 1.0);
  // gamma
  color = clamp( pow(color, vec3(gamma)), 0.0, 1.0);
  // saturation
  float luminance = dot( color, w );
  color = mix(vec3(luminance), color, saturation);

  gl_FragColor = vec4(color, tex.a);
}`
});

// Seperate shader for float texture
export const brightnessCompositeFragment = new FragmentShader({
  name: 'brightnessFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    brightness: uniform('float', 0.0)
  },
  main: glsl`
void main() {
  vec4 tex = texture2D( texture, v_Texcoord);
  vec3 color = tex.rgb + vec3(brightness);
  gl_FragColor = vec4(color, tex.a);
}`
});

export const contrastCompositeFragment = new FragmentShader({
  name: 'contrastFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    contrast: uniform('float', 1.0)
  },
  main: glsl`
void main() {
  vec4 tex = texture2D( texture, v_Texcoord);
  vec3 color = (tex.rgb-vec3(0.5))*contrast+vec3(0.5);
  gl_FragColor = vec4(color, tex.a);
}`
});

export const exposureCompositeFragment = new FragmentShader({
  name: 'exposureFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    exposure: uniform('float', 0.0)
  },
  main: glsl`
void main() {
  vec4 tex = texture2D(texture, v_Texcoord);
  vec3 color = tex.rgb * pow(2.0, exposure);
  gl_FragColor = vec4(color, tex.a);
}`
});

export const gammaCompositeFragment = new FragmentShader({
  name: 'gammaFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    gamma: uniform('float', 1.0)
  },
  main: glsl`
void main() {
  vec4 tex = texture2D(texture, v_Texcoord);
  vec3 color = pow(tex.rgb, vec3(gamma));
  gl_FragColor = vec4(color, tex.a);
}`
});

export const saturationCompositeFragment = new FragmentShader({
  name: 'saturationFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    saturation: uniform('float', 1.0)
  },
  main: glsl`
const vec3 w = vec3(0.2125, 0.7154, 0.0721);
void main() {
  vec4 tex = texture2D(texture, v_Texcoord);
  vec3 color = tex.rgb;
  float luminance = dot(color, w);
  color = mix(vec3(luminance), color, saturation);
  gl_FragColor = vec4(color, tex.a);
}`
});
