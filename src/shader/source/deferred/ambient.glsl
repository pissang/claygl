@export clay.deferred.ambient_light

uniform sampler2D gBufferTexture1;
uniform sampler2D gBufferTexture3;
uniform vec3 lightColor;

uniform vec2 windowSize: WINDOW_SIZE;

void main()
{
    vec2 uv = gl_FragCoord.xy / windowSize;

    vec4 texel1 = texture2D(gBufferTexture1, uv);
    // Is empty
    if (dot(texel1.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    vec3 albedo = texture2D(gBufferTexture3, uv).rgb;
    gl_FragColor.rgb = lightColor * albedo;
    gl_FragColor.a = 1.0;
}
@end