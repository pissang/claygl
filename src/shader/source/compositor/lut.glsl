
// https://github.com/BradLarson/GPUImage?source=c
@export clay.compositor.lut

varying vec2 v_Texcoord;

uniform sampler2D texture;
// minFilter: LINEAR, magFilter: LINEAR, flipY: false
uniform sampler2D lookup;

void main()
{

    vec4 tex = texture2D(texture, v_Texcoord);

    float blueColor = tex.b * 63.0;

    vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);

    vec2 quad2;
    quad2.y = floor(ceil(blueColor) / 8.0);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);

    vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * tex.r);
    texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * tex.g);

    vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * tex.r);
    texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * tex.g);

    vec4 newColor1 = texture2D(lookup, texPos1);
    vec4 newColor2 = texture2D(lookup, texPos2);

    vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
    gl_FragColor = vec4(newColor.rgb, tex.w);
}

@end