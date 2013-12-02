// https://github.com/mitsuhiko/webgl-meincraft/blob/master/assets/shaders/fxaa.glsl
@export buildin.compositor.fxaa

uniform sampler2D texture;
uniform vec2 viewportSize : [512, 512];

varying vec2 v_Texcoord;

#define FXAA_REDUCE_MIN   (1.0/128.0)
#define FXAA_REDUCE_MUL   (1.0/8.0)
#define FXAA_SPAN_MAX     8.0

void main()
{
    vec2 resolution = 1.0 / viewportSize;
    vec3 rgbNW = texture2D( texture, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;
    vec3 rgbNE = texture2D( texture, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;
    vec3 rgbSW = texture2D( texture, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;
    vec3 rgbSE = texture2D( texture, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;
    vec4 rgbaM  = texture2D( texture,  gl_FragCoord.xy  * resolution );
    vec3 rgbM  = rgbaM.xyz;
    float opacity  = rgbaM.w;

    vec3 luma = vec3( 0.299, 0.587, 0.114 );

    float lumaNW = dot( rgbNW, luma );
    float lumaNE = dot( rgbNE, luma );
    float lumaSW = dot( rgbSW, luma );
    float lumaSE = dot( rgbSE, luma );
    float lumaM  = dot( rgbM,  luma );
    float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );
    float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );

    float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );
    dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
          max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
                dir * rcpDirMin)) * resolution;

    vec3 rgbA = texture2D( texture, gl_FragCoord.xy  * resolution + dir * ( 1.0 / 3.0 - 0.5 ) ).xyz;
    rgbA += texture2D( texture, gl_FragCoord.xy  * resolution + dir * ( 2.0 / 3.0 - 0.5 ) ).xyz;
    rgbA *= 0.5;

    vec3 rgbB = texture2D( texture, gl_FragCoord.xy  * resolution + dir * -0.5 ).xyz;
    rgbB += texture2D( texture, gl_FragCoord.xy  * resolution + dir * 0.5 ).xyz;
    rgbB *= 0.25;
    rgbB += rgbA * 0.5;

    float lumaB = dot( rgbB, luma );

    if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) )
    {

        gl_FragColor = vec4( rgbA, opacity );

    } else {

        gl_FragColor = vec4( rgbB, opacity );

    }
}

@end