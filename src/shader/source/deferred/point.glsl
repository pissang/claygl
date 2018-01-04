@export clay.deferred.point_light

@import clay.deferred.chunk.light_head

@import clay.util.calculate_attenuation

@import clay.deferred.chunk.light_equation

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightRange;

uniform vec3 eyePosition;

#ifdef SHADOWMAP_ENABLED
uniform samplerCube lightShadowMap;
uniform float lightShadowMapSize;
#endif

varying vec3 v_Position;

@import clay.plugin.shadow_map_common

void main()
{
    @import clay.deferred.chunk.gbuffer_read

    vec3 L = lightPosition - position;
    vec3 V = normalize(eyePosition - position);

    float dist = length(L);
    L /= dist;

    vec3 H = normalize(L + V);

    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float attenuation = lightAttenuation(dist, lightRange);
    // Diffuse term
    gl_FragColor.rgb = attenuation * lightEquation(
        lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
    );

#ifdef SHADOWMAP_ENABLED
    float shadowContrib = computeShadowContribOmni(
        lightShadowMap, -L * dist, lightRange
    );
    gl_FragColor.rgb *= clamp(shadowContrib, 0.0, 1.0);
#endif

    gl_FragColor.a = 1.0;
}
@end