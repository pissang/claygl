import { FragmentShader, glsl, Shader } from 'claygl';
import { HDREncoderMixin } from 'claygl/shaders';
const { uniform } = Shader;

export const tronFragment = new FragmentShader({
  name: 'tronFrag',
  uniforms: {
    color: uniform('vec3', [0.0, 0.775, 0.189]),
    sharpness: uniform('float', 10.0),
    substraction: uniform('float', 0.3),
    strength: uniform('float', 50.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
// https://www.youtube.com/watch?v=KHiZfy5OlO8
void main() {
  vec2 factor = vec2(1.0) - sin(v_Texcoord * 3.1415926);
  factor = pow(factor, vec2(sharpness));
  factor -= vec2(substraction);
  float weight = clamp(mix(factor.x, factor.y, 0.5), 0.0, 1.0);
  if (weight == 0.0) {
    discard;
  }
  out_color = encodeHDR(vec4(weight * color * strength, 1.0));
}`
});
