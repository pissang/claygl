@export clay.deferred.chunk.light_head

uniform sampler2D gBufferTexture1;
uniform sampler2D gBufferTexture2;
uniform sampler2D gBufferTexture3;

// Window size for window relative coordinate
// https://www.opengl.org/sdk/docs/man/html/gl_FragCoord.xhtml
uniform vec2 windowSize: WINDOW_SIZE;

uniform vec4 viewport: VIEWPORT;

uniform mat4 viewProjectionInv;


#ifdef DEPTH_ENCODED
@import clay.util.decode_float
#endif

@end

@export clay.deferred.chunk.gbuffer_read
    // Extract
    // - N, z, position
    // - albedo, metalness, specularColor, diffuseColor

    // uv in window
    vec2 uv = gl_FragCoord.xy / windowSize;

    // uv in viewport, for position reconstruct
    vec2 uv2 = (gl_FragCoord.xy - viewport.xy) / viewport.zw;

    vec4 texel1 = texture2D(gBufferTexture1, uv);
    vec4 texel3 = texture2D(gBufferTexture3, uv);
    // Is empty
    if (dot(texel1.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    float glossiness = texel1.a;
    float metalness = texel3.a;

    // vec3 N;
    // N.xy = texel1.rg * 2.0 - 1.0;
    // N.z = sign(metalness) * sqrt(clamp(1.0 - dot(N.xy, N.xy), 0.0, 1.0));
    // N = normalize(N);
    vec3 N = texel1.rgb * 2.0 - 1.0;

    // Depth buffer range is 0.0 - 1.0
    float z = texture2D(gBufferTexture2, uv).r * 2.0 - 1.0;

    vec2 xy = uv2 * 2.0 - 1.0;

    vec4 projectedPos = vec4(xy, z, 1.0);
    vec4 p4 = viewProjectionInv * projectedPos;

    vec3 position = p4.xyz / p4.w;

    vec3 albedo = texel3.rgb;

    vec3 diffuseColor = albedo * (1.0 - metalness);
    vec3 specularColor = mix(vec3(0.04), albedo, metalness);
@end

@export clay.deferred.chunk.light_equation

float D_Phong(in float g, in float ndh) {
    // from black ops 2
    float a = pow(8192.0, g);
    return (a + 2.0) / 8.0 * pow(ndh, a);
}

float D_GGX(in float g, in float ndh) {
    float r = 1.0 - g;
    float a = r * r;
    float tmp = ndh * ndh * (a - 1.0) + 1.0;
    return a / (3.1415926 * tmp * tmp);
}

// Fresnel
vec3 F_Schlick(in float ndv, vec3 spec) {
    return spec + (1.0 - spec) * pow(1.0 - ndv, 5.0);
}

vec3 lightEquation(
    in vec3 lightColor, in vec3 diffuseColor, in vec3 specularColor,
    in float ndl, in float ndh, in float ndv, in float g
)
{
    return ndl * lightColor
        * (diffuseColor + D_Phong(g, ndh) * F_Schlick(ndv, specularColor));
}

@end