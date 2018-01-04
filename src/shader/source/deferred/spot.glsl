@export clay.deferred.spot_light

@import clay.deferred.chunk.light_head

@import clay.deferred.chunk.light_equation

@import clay.util.calculate_attenuation

uniform vec3 lightPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform float umbraAngleCosine;
uniform float penumbraAngleCosine;
uniform float lightRange;
uniform float falloffFactor;

uniform vec3 eyePosition;

#ifdef SHADOWMAP_ENABLED
uniform sampler2D lightShadowMap;
uniform mat4 lightMatrix;
uniform float lightShadowMapSize;
#endif

@import clay.plugin.shadow_map_common

void main()
{
    @import clay.deferred.chunk.gbuffer_read

    vec3 L = lightPosition - position;
    vec3 V = normalize(eyePosition - position);

    float dist = length(L);
    L /= dist;


    float attenuation = lightAttenuation(dist, lightRange);
    float c = dot(-normalize(lightDirection), L);

    float falloff = clamp((c - umbraAngleCosine) / (penumbraAngleCosine - umbraAngleCosine), 0.0, 1.0);
    falloff = pow(falloff, falloffFactor);

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    // Diffuse term
    gl_FragColor.rgb = (1.0 - falloff) * attenuation * lightEquation(
        lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
    );

#ifdef SHADOWMAP_ENABLED
    float shadowContrib = computeShadowContrib(
        lightShadowMap, lightMatrix, position, lightShadowMapSize
    );
    gl_FragColor.rgb *= shadowContrib;
#endif

    gl_FragColor.a = 1.0;
}
@end
