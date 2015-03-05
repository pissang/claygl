@export buildin.deferred.point_light

@import buildin.deferred.chunk.light_head

@import buildin.util.calculate_attenuation

@import buildin.deferred.chunk.light_equation

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform float lightRange;

uniform vec3 eyePosition;

varying vec3 v_Position;

void main()
{
    @import buildin.deferred.chunk.gbuffer_read

    vec3 L = lightPosition - position;
    vec3 V = normalize(eyePosition - position);

    float dist = length(L);
    L /= dist;

    vec3 H = normalize(L + V);

    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float attenuation = lightAttenuation(dist, lightRange);
    // Diffuse term
    gl_FragColor.rgb = lightColor * ndl * attenuation;
    if (dot(gl_FragColor.rgb, vec3(1.0)) == 0.0) // Reduce blending
    {
        discard;
    }
    // // Specular luminance
    gl_FragColor.a = dot(LUM, gl_FragColor.rgb * D_Phong(glossiness, ndh));
}
@end