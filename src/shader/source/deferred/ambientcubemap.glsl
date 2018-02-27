@export clay.deferred.ambient_cubemap_light

@import clay.deferred.chunk.light_head

uniform vec3 lightColor;
uniform samplerCube lightCubemap;
uniform sampler2D brdfLookup;

uniform vec3 eyePosition;

@import clay.util.rgbm

void main()
{
    @import clay.deferred.chunk.gbuffer_read

    vec3 V = normalize(eyePosition - position);
    vec3 L = reflect(-V, N);

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float rough = clamp(1.0 - glossiness, 0.0, 1.0);
    // FIXME fixed maxMipmapLevel ?
    float bias = rough * 5.0;
    // One brdf lookup is enough
    vec2 brdfParam = texture2D(brdfLookup, vec2(rough, ndv)).xy;
    vec3 envWeight = specularColor * brdfParam.x + brdfParam.y;

    vec3 envTexel = RGBMDecode(textureCubeLodEXT(lightCubemap, L, bias), 8.12);
    // TODO mix ?
    gl_FragColor.rgb = lightColor * envTexel * envWeight;

    gl_FragColor.a = 1.0;
}
@end