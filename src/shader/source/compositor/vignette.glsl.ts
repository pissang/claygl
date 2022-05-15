import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { decodeHDRFunction, encodeHDRFunction } from '../util.glsl';

/**
 * Vignette effects
 */
export const vignetteCompositeFragment = new FragmentShader({
  name: 'vignetteFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    darkness: uniform('float', 1),
    offset: uniform('float', 1)
  },
  main: glsl`
${encodeHDRFunction()}
${decodeHDRFunction()}

void main() {
  vec4 texel = decodeHDR(texture2D(texture, v_Texcoord));
  vec2 uv = (v_Texcoord - vec2(0.5)) * vec2(offset);
  gl_FragColor = encodeHDR(vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a));
}

  `
});
