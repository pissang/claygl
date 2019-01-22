@export clay.basic.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

uniform vec2 uvRepeat : [1.0, 1.0];
uniform vec2 uvOffset : [0.0, 0.0];

attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 position : POSITION;

attribute vec3 barycentric;

@import clay.chunk.skinning_header

@import clay.chunk.instancing_header

varying vec2 v_Texcoord;
varying vec3 v_Barycentric;

#ifdef VERTEX_COLOR
attribute vec4 a_Color : COLOR;
varying vec4 v_Color;
#endif

void main()
{
    vec4 skinnedPosition = vec4(position, 1.0);

#ifdef SKINNING
    @import clay.chunk.skin_matrix
    skinnedPosition = skinMatrixWS * skinnedPosition;
#endif

#ifdef INSTANCING
    @import clay.chunk.instancing_matrix
    skinnedPosition = instanceMat * skinnedPosition;
#endif

    v_Texcoord = texcoord * uvRepeat + uvOffset;
    v_Barycentric = barycentric;

    gl_Position = worldViewProjection * skinnedPosition;

#ifdef VERTEX_COLOR
    v_Color = a_Color;
#endif
}

@end




@export clay.basic.fragment

#define DIFFUSEMAP_ALPHA_ALPHA

varying vec2 v_Texcoord;
uniform sampler2D diffuseMap;
uniform vec3 color : [1.0, 1.0, 1.0];
uniform vec3 emission : [0.0, 0.0, 0.0];
uniform float alpha : 1.0;

#ifdef ALPHA_TEST
uniform float alphaCutoff: 0.9;
#endif

#ifdef VERTEX_COLOR
varying vec4 v_Color;
#endif

// Uniforms for wireframe
uniform float lineWidth : 0.0;
uniform vec4 lineColor : [0.0, 0.0, 0.0, 0.6];
varying vec3 v_Barycentric;

@import clay.util.edge_factor

@import clay.util.rgbm

@import clay.util.srgb

@import clay.util.ACES

void main()
{
    gl_FragColor = vec4(color, alpha);

#ifdef VERTEX_COLOR
    gl_FragColor *= v_Color;
#endif

#ifdef SRGB_DECODE
    gl_FragColor = sRGBToLinear(gl_FragColor);
#endif


#ifdef DIFFUSEMAP_ENABLED
    vec4 texel = decodeHDR(texture2D(diffuseMap, v_Texcoord));

#ifdef SRGB_DECODE
    texel = sRGBToLinear(texel);
#endif

#if defined(DIFFUSEMAP_ALPHA_ALPHA)
    gl_FragColor.a = texel.a;
#endif

    gl_FragColor.rgb *= texel.rgb;
#endif

    gl_FragColor.rgb += emission;
    if( lineWidth > 0.)
    {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, lineColor.rgb, (1.0 - edgeFactor(lineWidth)) * lineColor.a);
    }

#ifdef ALPHA_TEST
    if (gl_FragColor.a < alphaCutoff) {
        discard;
    }
#endif

#ifdef TONEMAPPING
    gl_FragColor.rgb = ACESToneMapping(gl_FragColor.rgb);
#endif
#ifdef SRGB_ENCODE
    gl_FragColor = linearTosRGB(gl_FragColor);
#endif

    gl_FragColor = encodeHDR(gl_FragColor);

}

@end