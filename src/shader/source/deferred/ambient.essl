@export buildin.deferred.ambient_light
uniform sampler2D normalTexture;
uniform vec3 lightColor;

varying vec2 v_Texcoord;

void main()
{
    vec4 tex = texture2D(normalTexture, v_Texcoord);
    vec3 normal = tex.rgb * 2.0 - 1.0;

    gl_FragColor.rgb = lightColor * (clamp(normal.y * 0.7, 0.0, 1.0) + 0.3);
    gl_FragColor.a = 0.0;
}
@end