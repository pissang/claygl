import { FragmentShader, glsl, Shader } from 'claygl';
import { lightAttenuationMixin } from 'claygl/shaders';
import {
  gBufferReadMixin,
  lightEquationFunction
} from '../../../src/shader/source/deferred/chunk.glsl';

export const deferredAreaLightFragment = new FragmentShader({
  name: 'deferredAreaLightFrag',
  uniforms: {
    lightPosition: Shader.uniform('vec3'),
    lightColor: Shader.uniform('vec3'),
    lightHalfWidth: Shader.uniform('vec3'),
    lightHalfHeight: Shader.uniform('vec3'),

    eyePosition: Shader.uniform('vec3'),

    ltc_1: Shader.uniform('sampler2D'),
    ltc_2: Shader.uniform('sampler2D')
  },
  includes: [gBufferReadMixin, lightAttenuationMixin],
  main: glsl`

${lightEquationFunction()}

// From THREE.js
vec2 LTC_Uv(const in vec3 N, const in vec3 V, const in float roughness) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = (LUT_SIZE - 1.0) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;

	float ndv = clamp(dot(N, V), 0.0, 1.0);

	// texture parameterized by sqrt(GGX alpha) and sqrt(1 - cos(theta))
	vec2 uv = vec2(roughness, sqrt(1.0 - ndv));

	uv = uv * LUT_SCALE + LUT_BIAS;

	return uv;
}

float LTC_ClippedSphereFormFactor(const in vec3 f) {
	// Real-Time Area Lighting: a Journey from Research to Production (p.102)
	// An approximation of the form factor of a horizon-clipped rectangle.
	float l = length(f);
	return max((l * l + f.z) / (l + 1.0), 0.0);
}

vec3 LTC_EdgeVectorFormFactor(const in vec3 v1, const in vec3 v2) {
	float x = dot(v1, v2);

	float y = abs(x);

	// rational polynomial approximation to theta / sin(theta) / 2PI
	float a = 0.8543985 + (0.4965155 + 0.0145206 * y) * y;
	float b = 3.4175940 + (4.1616724 + y) * y;
	float v = a / b;

	float theta_sintheta = (x > 0.0) ? v : 0.5 * inversesqrt(max(1.0 - x * x, 1e-7)) - v;

	return cross(v1, v2) * theta_sintheta;
}

vec3 LTC_Evaluate(const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[4]) {
	// bail if point is on back side of plane of light
	// assumes ccw winding order of light vertices
	vec3 v1 = rectCoords[1] - rectCoords[0];
	vec3 v2 = rectCoords[3] - rectCoords[0];
	vec3 lightNormal = cross(v1, v2);

	if(dot(lightNormal, P - rectCoords[0]) < 0.0) return vec3(0.0);

	// construct orthonormal basis around N
	vec3 T1, T2;
	T1 = normalize(V - N * dot(V, N));
	T2 = - cross(N, T1); // negated from paper; possibly due to a different handedness of world coordinate system

	// compute transform
	mat3 mat = mInv * transpose(mat3(T1, T2, N));

	// transform rect
	vec3 coords[4];
	coords[0] = mat * (rectCoords[0] - P);
	coords[1] = mat * (rectCoords[1] - P);
	coords[2] = mat * (rectCoords[2] - P);
	coords[3] = mat * (rectCoords[3] - P);

	// project rect onto sphere
	coords[0] = normalize(coords[0]);
	coords[1] = normalize(coords[1]);
	coords[2] = normalize(coords[2]);
	coords[3] = normalize(coords[3]);

	// calculate vector form factor
	vec3 vectorFormFactor = vec3(0.0);
	vectorFormFactor += LTC_EdgeVectorFormFactor(coords[0], coords[1]);
	vectorFormFactor += LTC_EdgeVectorFormFactor(coords[1], coords[2]);
	vectorFormFactor += LTC_EdgeVectorFormFactor(coords[2], coords[3]);
	vectorFormFactor += LTC_EdgeVectorFormFactor(coords[3], coords[0]);

	// adjust for horizon clipping
	float result = LTC_ClippedSphereFormFactor(vectorFormFactor);

/*
	// alternate method of adjusting for horizon clipping (see referece)
	// refactoring required
	float len = length(vectorFormFactor);
	float z = vectorFormFactor.z / len;

	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = (LUT_SIZE - 1.0) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;

	// tabulated horizon-clipped sphere, apparently...
	vec2 uv = vec2(z * 0.5 + 0.5, len);
	uv = uv * LUT_SCALE + LUT_BIAS;

	float scale = texture2D(ltc_2, uv).w;

	float result = len * scale;
*/

	return vec3(result);

}


void main() {
  ${gBufferReadMixin.main}

  vec3 V = normalize(eyePosition - position);

  float roughness = 1.0 - glossiness;

  vec3 rectCoords[4];
  // counterclockwise; light shines in local neg z direction
  rectCoords[0] = lightPosition + lightHalfWidth - lightHalfHeight;
  rectCoords[1] = lightPosition - lightHalfWidth - lightHalfHeight;
  rectCoords[2] = lightPosition - lightHalfWidth + lightHalfHeight;
  rectCoords[3] = lightPosition + lightHalfWidth + lightHalfHeight;

  vec2 ltcUv = LTC_Uv(N, V, roughness);

  vec4 t1 = texture(ltc_1, ltcUv);
  vec4 t2 = texture(ltc_2, ltcUv);

  mat3 mInv = mat3(
    vec3(t1.x, 0, t1.y),
    vec3(   0, 1,   0),
    vec3(t1.z, 0, t1.w)
  );

  // LTC Fresnel Approximation by Stephen Hill
  // http://blog.selfshadow.com/publications/s2016-advances/s2016_ltc_fresnel.pdf
  vec3 fresnel = (specularColor * t2.x + (vec3(1.0) - specularColor) * t2.y);

  vec3 directSpecular = fresnel * LTC_Evaluate(N, V, position, mInv, rectCoords);
  vec3 directDiffuse = diffuseColor * LTC_Evaluate(N, V, position, mat3(1.0), rectCoords);

  out_color.rgb = (directDiffuse + directSpecular) * lightColor;

  out_color.a = 1.0;
}`
});
