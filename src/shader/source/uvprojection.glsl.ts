import { glsl } from '../../Shader';

export const UV_PROJECTION_NONE = 0;
export const UV_PROJECTION_SPHERICAL = 1;
export const UV_PROJECTION_TRIPLANAR = 2;

export default glsl`

vec4 triplanarProjectionSample(sampler2D _map, vec3 pos, vec3 normal, vec2 uvScale, float blending) {
  vec3 absNormal = abs(normal);
  // Calculate blending power - higher expo means sharper transitions
  float expo = (1.0 - blending) * 125.0 + blending * 3.0;
  
  // Weight each axis by its normal component raised to expo power
  vec3 weights = pow(absNormal, vec3(expo));
  
  // Normalize weights so they sum to 1
  weights = weights / (weights.x + weights.y + weights.z);
  
  // Project UVs on each axis plane (yz, xz, xy)
  vec2 yzPlane = pos.yz * uvScale;
  vec2 xzPlane = pos.xz * uvScale;
  vec2 xyPlane = pos.xy * uvScale;

  // Sample maps
  vec4 yz = texture(_map, fract(yzPlane));
  vec4 xz = texture(_map, fract(xzPlane));
  vec4 xy = texture(_map, fract(xyPlane));
  
  // Blend the projected coordinates using the weights
  return weights.x * yz + weights.y * xz + weights.z * xy;
}

vec2 sphericalProjection(vec3 normal) {
  vec3 n = normalize(normal);
  float theta = atan(n.x, n.z) / (2.0 * PI) + 0.5;
  float phi = acos(n.y) / PI;
  return vec2(theta, 1.0 - phi);
}

`;
