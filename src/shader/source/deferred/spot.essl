@export buildin.deferred.spot_light

@import buildin.deferred.chunk.light_head

@import buildin.deferred.chunk.light_equation

@import buildin.util.calculate_attenuation

uniform vec3 lightPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform float umbraAngleCosine;
uniform float penumbraAngleCosine;
uniform float lightRange;
uniform float falloffFactor;

uniform vec3 eyePosition;

void main()
{
    @import buildin.deferred.chunk.gbuffer_read

    vec3 L = lightPosition - position;
    vec3 V = normalize(eyePosition - position);

    float dist = length(L);
    L /= dist;

    float attenuation = lightAttenuation(dist, lightRange);
    float c = dot(-lightDirection, L);

    float falloff = clamp((c - umbraAngleCosine) / (penumbraAngleCosine - umbraAngleCosine), 0.0, 1.0);
    falloff = pow(falloff, falloffFactor);

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);

    // Diffuse term
    gl_FragColor.rgb = lightColor * ndl * (1.0 - falloff) * attenuation;
    if (dot(gl_FragColor.rgb, vec3(1.0)) == 0.0) // Reduce blending
    {
        discard;
    }
    gl_FragColor.a = dot(LUM, gl_FragColor.rgb * D_Phong(glossiness, ndh));
}
@end
