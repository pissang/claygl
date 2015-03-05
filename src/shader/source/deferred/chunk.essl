@export buildin.deferred.chunk.light_head
uniform sampler2D normalTex;
uniform vec2 viewportSize;

uniform mat4 viewProjectionInv;

const vec3 LUM = vec3(0.2125, 0.7154, 0.0721);
@end

@export buildin.deferred.chunk.gbuffer_read
    vec2 uv = gl_FragCoord.xy / viewportSize;

    vec4 tex = texture2D(normalTex, uv);
    // Is empty
    if (dot(tex.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    vec3 N;
    N.xy = tex.rg * 2.0 - 1.0;
    N.z = sqrt(1.0 - dot(N.xy, N.xy));

    // Depth value in depth texture is 0 - 1
    // float z = texture2D(depthTex, uv).r * 2.0 - 1.0;
    float z = tex.b;

    float glossiness = tex.a;

    vec2 xy = uv * 2.0 - 1.0;

    vec4 projectedPos = vec4(xy, z, 1.0);
    vec4 p4 = viewProjectionInv * projectedPos;

    vec3 position = p4.xyz / p4.w;
@end

@export buildin.deferred.chunk.light_equation

float D_Phong(float g, float ndh) {
    // from black ops 2
    float a = pow(8192.0, g);
    return (a + 2.0) / 8.0 * pow(ndh, a);
}

@end