@export tron.vertex

@import clay.basic.vertex

@end




@export tron.fragment

varying vec2 v_Texcoord;
uniform vec3 color : [0.0, 0.775, 0.189];

uniform float sharpness : 10.0;
uniform float substraction: 0.3;
uniform float strength: 50.0;

@import clay.util.rgbm
// https://www.youtube.com/watch?v=KHiZfy5OlO8
void main()
{
    vec2 factor = vec2(1.0) - sin(v_Texcoord * 3.1415926);
    factor = pow(factor, vec2(sharpness));
    factor -= vec2(substraction);
    float weight = clamp(mix(factor.x, factor.y, 0.5), 0.0, 1.0);
    if (weight == 0.0) {
        discard;
    }
    gl_FragColor = encodeHDR(vec4(weight * color * strength, 1.0));
}

@end