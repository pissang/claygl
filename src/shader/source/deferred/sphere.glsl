@export clay.deferred.sphere_light

@import clay.deferred.chunk.light_head

@import clay.util.calculate_attenuation

@import clay.deferred.chunk.light_equation

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightRange;
uniform float lightRadius;

uniform vec3 eyePosition;

varying vec3 v_Position;

void main()
{
    @import clay.deferred.chunk.gbuffer_read


    vec3 L = lightPosition - position;

    vec3 V = normalize(eyePosition - position);

    float dist = length(L);
    // Light pos fix
    vec3 R = reflect(V, N);
    float tmp = dot(L, R);
    vec3 cToR = tmp * R - L;
    float d = length(cToR);
    L = L + cToR * clamp(lightRadius / d, 0.0, 1.0);

    L = normalize(L);

    vec3 H = normalize(L + V);

    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float attenuation = lightAttenuation(dist, lightRange);
    // Diffuse term
    gl_FragColor.rgb = lightColor * ndl * attenuation;

    // Specular fix
    glossiness = clamp(glossiness - lightRadius / 2.0 / dist, 0.0, 1.0);

    gl_FragColor.rgb = attenuation * lightEquation(
        lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
    );

    gl_FragColor.a = 1.0;
}
@end