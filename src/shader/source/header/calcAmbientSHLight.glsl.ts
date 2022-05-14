import { createShaderFunction, FUNCTION_NAME_PLACEHOLDER, glsl } from '../../../Shader';

const COEFF_NAME = 'ambientSHLightCoefficients';
export const calcAmbientSHLightFunction = createShaderFunction(
  glsl`
vec3 ${FUNCTION_NAME_PLACEHOLDER}(int idx, vec3 N) {
  int offset = 9 * idx;
  // FIXME Index expression must be constant
  return ${COEFF_NAME}[0]
    + ${COEFF_NAME}[1] * N.x
    + ${COEFF_NAME}[2] * N.y
    + ${COEFF_NAME}[3] * N.z
    + ${COEFF_NAME}[4] * N.x * N.z
    + ${COEFF_NAME}[5] * N.z * N.y
    + ${COEFF_NAME}[6] * N.y * N.x
    + ${COEFF_NAME}[7] * (3.0 * N.z * N.z - 1.0)
    + ${COEFF_NAME}[8] * (N.x * N.x - N.y * N.y);
}`,
  'calcAmbientSHLight'
);
