@export qtek.basic.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

uniform vec2 uvRepeat : [1.0, 1.0];
uniform vec2 uvOffset : [0.0, 0.0];

attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 position : POSITION;

attribute vec3 barycentric;

@import qtek.chunk.skinning_header

varying vec2 v_Texcoord;
varying vec3 v_Barycentric;

#ifdef VERTEX_COLOR
attribute vec4 a_Color : COLOR;
varying vec4 v_Color;
#endif

void main()
{
    vec3 skinnedPosition = position;

#ifdef SKINNING
    @import qtek.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif

    v_Texcoord = texcoord * uvRepeat + uvOffset;
    v_Barycentric = barycentric;

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);

#ifdef VERTEX_COLOR
    v_Color = a_Color;
#endif
}

@end




@export qtek.basic.fragment


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

@import qtek.util.edge_factor

@import qtek.util.rgbm

@import qtek.util.srgb

void main()
{

#ifdef RENDER_TEXCOORD
    gl_FragColor = vec4(v_Texcoord, 1.0, 1.0);
    return;
#endif

    gl_FragColor = vec4(color, alpha);

#ifdef VERTEX_COLOR
    gl_FragColor *= v_Color;
#endif

#ifdef DIFFUSEMAP_ENABLED
    vec4 tex = decodeHDR(texture2D(diffuseMap, v_Texcoord));

#ifdef SRGB_DECODE
    tex = sRGBToLinear(tex);
#endif

#if defined(DIFFUSEMAP_ALPHA_ALPHA)
    gl_FragColor.a = tex.a;
#endif

    gl_FragColor.rgb *= tex.rgb;
#endif

    gl_FragColor.rgb += emission;
    if( lineWidth > 0.)
    {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, lineColor.rgb, (1.0 - edgeFactor(lineWidth)) * lineColor.a);
    }

#ifdef GAMMA_ENCODE
    // Not linear
    gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1 / 2.2));
#endif

#ifdef ALPHA_TEST
    if (gl_FragColor.a < alphaCutoff) {
        discard;
    }
#endif

    gl_FragColor = encodeHDR(gl_FragColor);

}

@end