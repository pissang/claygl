
@export buildin.compositor.lum

varying vec2 v_Texcoord;

uniform sampler2D texture;

const vec3 w = vec3(0.2125, 0.7154, 0.0721);

void main()
{
    vec4 tex = texture2D( texture, v_Texcoord );
    float luminance = dot(tex.rgb, w);

    gl_FragColor = vec4(vec3(luminance), 1.0);
}

@end