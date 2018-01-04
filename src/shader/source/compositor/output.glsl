@export clay.compositor.output

#define OUTPUT_ALPHA

varying vec2 v_Texcoord;

uniform sampler2D texture;

@import clay.util.rgbm

void main()
{
    vec4 tex = decodeHDR(texture2D(texture, v_Texcoord));

    gl_FragColor.rgb = tex.rgb;

#ifdef OUTPUT_ALPHA
    gl_FragColor.a = tex.a;
#else
    gl_FragColor.a = 1.0;
#endif

    gl_FragColor = encodeHDR(gl_FragColor);

    // Premultiply alpha
    // or webgl will divide alpha.
#ifdef PREMULTIPLY_ALPHA
    gl_FragColor.rgb *= gl_FragColor.a;
#endif
}

@end