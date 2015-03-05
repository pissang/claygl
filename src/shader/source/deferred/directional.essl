@export buildin.deferred.directional_light

@import buildin.deferred.chunk.light_head

@import buildin.deferred.chunk.light_equation

uniform vec3 lightDirection;
uniform vec3 lightColor;

uniform vec3 eyePosition;

void main()
{
    @import buildin.deferred.chunk.gbuffer_read

    vec3 L = -normalize(lightDirection);
    vec3 V = normalize(eyePosition - position);

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);

    gl_FragColor.rgb = ndl * lightColor;
    gl_FragColor.a = dot(LUM, gl_FragColor.rgb * D_Phong(glossiness, ndh));
}
@end
