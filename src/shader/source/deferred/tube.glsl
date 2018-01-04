@export clay.deferred.tube_light

@import clay.deferred.chunk.light_head

@import clay.util.calculate_attenuation

@import clay.deferred.chunk.light_equation

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightRange;
uniform vec3 lightExtend;

uniform vec3 eyePosition;

varying vec3 v_Position;

void main()
{
    @import clay.deferred.chunk.gbuffer_read

    vec3 L = lightPosition - position;

    vec3 V = normalize(eyePosition - position);

    // Light pos and irradiance fix
    vec3 R = reflect(V, N);

    vec3 L0 = lightPosition - lightExtend - position;
    vec3 L1 = lightPosition + lightExtend - position;
    vec3 LD = L1 - L0;

    float len0 = length(L0);
    float len1 = length(L1);
    float irra = 2.0 * clamp(dot(N, L0) / (2.0 * len0) + dot(N, L1) / (2.0 * len1), 0.0, 1.0);

    float LDDotR = dot(R, LD);
    float t = (LDDotR * dot(R, L0) - dot(L0, LD)) / (dot(LD, LD) - LDDotR * LDDotR);
    t = clamp(t, 0.0, 1.0);
    L = L0 + t * LD;
    // FIXME attenuation integration
    float dist = length(L);
    L /= dist;

    vec3 H = normalize(L + V);

    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    // Specular fix
    glossiness = clamp(glossiness - 0.0 / 2.0 / dist, 0.0, 1.0);

    gl_FragColor.rgb = lightColor * irra * lightAttenuation(dist, lightRange)
        * (diffuseColor + D_Phong(glossiness, ndh) * F_Schlick(ndv, specularColor));

    // Specular luminance
    gl_FragColor.a = 1.0;
}
@end