/**
 * http://en.wikipedia.org/wiki/Lambertian_reflectance
 */

@export clay.lambert.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

uniform vec2 uvRepeat : [1.0, 1.0];
uniform vec2 uvOffset : [0.0, 0.0];

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 normal : NORMAL;

attribute vec3 barycentric;

#ifdef VERTEX_COLOR
attribute vec4 a_Color : COLOR;
varying vec4 v_Color;
#endif

@import clay.chunk.skinning_header
@import clay.chunk.instancing_header

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;
varying vec3 v_Barycentric;

void main()
{

    vec4 skinnedPosition = vec4(position, 1.0);
    vec4 skinnedNormal = vec4(normal, 0.0);

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    skinnedPosition = skinMatrixWS * skinnedPosition;
    // Upper 3x3 of skinMatrix is orthogonal
    skinnedNormal = skinMatrixWS * skinnedNormal;
#endif

#ifdef INSTANCING
    @import clay.chunk.instancing_matrix
    skinnedPosition = instanceMat * skinnedPosition;
    skinnedNormal = instanceMat * skinnedNormal;
#endif

    gl_Position = worldViewProjection * skinnedPosition;

    v_Texcoord = texcoord * uvRepeat + uvOffset;
    v_Normal = normalize((worldInverseTranspose * skinnedNormal).xyz);
    v_WorldPosition = ( world * skinnedPosition ).xyz;

    v_Barycentric = barycentric;

#ifdef VERTEX_COLOR
    v_Color = a_Color;
#endif
}

@end


@export clay.lambert.fragment

#define DIFFUSEMAP_ALPHA_ALPHA

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

uniform sampler2D diffuseMap;
uniform sampler2D alphaMap;

uniform vec3 color : [1.0, 1.0, 1.0];
uniform vec3 emission : [0.0, 0.0, 0.0];
uniform float alpha : 1.0;

#ifdef ALPHA_TEST
uniform float alphaCutoff: 0.9;
#endif

// Uniforms for wireframe
uniform float lineWidth : 0.0;
uniform vec4 lineColor : [0.0, 0.0, 0.0, 0.6];
varying vec3 v_Barycentric;

#ifdef VERTEX_COLOR
varying vec4 v_Color;
#endif

#ifdef AMBIENT_LIGHT_COUNT
@import clay.header.ambient_light
#endif
#ifdef AMBIENT_SH_LIGHT_COUNT
@import clay.header.ambient_sh_light
#endif
#ifdef POINT_LIGHT_COUNT
@import clay.header.point_light
#endif
#ifdef DIRECTIONAL_LIGHT_COUNT
@import clay.header.directional_light
#endif
#ifdef SPOT_LIGHT_COUNT
@import clay.header.spot_light
#endif

// Import util functions and uniforms needed
@import clay.util.calculate_attenuation

@import clay.util.edge_factor

@import clay.util.rgbm

@import clay.plugin.compute_shadow_map

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
    vec4 tex = texture2D( diffuseMap, v_Texcoord );
#ifdef SRGB_DECODE
    tex.rgb = pow(tex.rgb, vec3(2.2));
#endif
    gl_FragColor.rgb *= tex.rgb;
#ifdef DIFFUSEMAP_ALPHA_ALPHA
    gl_FragColor.a *= tex.a;
#endif
#endif

    vec3 diffuseColor = vec3(0.0, 0.0, 0.0);

#ifdef AMBIENT_LIGHT_COUNT
    for(int _idx_ = 0; _idx_ < AMBIENT_LIGHT_COUNT; _idx_++)
    {
        diffuseColor += ambientLightColor[_idx_];
    }
#endif
#ifdef AMBIENT_SH_LIGHT_COUNT
    for(int _idx_ = 0; _idx_ < AMBIENT_SH_LIGHT_COUNT; _idx_++)
    {{
        diffuseColor += calcAmbientSHLight(_idx_, v_Normal) * ambientSHLightColor[_idx_];
    }}
#endif
// Compute point light color
#ifdef POINT_LIGHT_COUNT
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsPoint[POINT_LIGHT_COUNT];
    if( shadowEnabled )
    {
        computeShadowOfPointLights(v_WorldPosition, shadowContribsPoint);
    }
#endif
    for(int i = 0; i < POINT_LIGHT_COUNT; i++)
    {

        vec3 lightPosition = pointLightPosition[i];
        vec3 lightColor = pointLightColor[i];
        float range = pointLightRange[i];

        vec3 lightDirection = lightPosition - v_WorldPosition;

        // Calculate point light attenuation
        float dist = length(lightDirection);
        float attenuation = lightAttenuation(dist, range);

        // Normalize vectors
        lightDirection /= dist;

        float ndl = dot( v_Normal, lightDirection );

        float shadowContrib = 1.0;
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
        if( shadowEnabled )
        {
            shadowContrib = shadowContribsPoint[i];
        }
#endif

        diffuseColor += lightColor * clamp(ndl, 0.0, 1.0) * attenuation * shadowContrib;
    }
#endif
#ifdef DIRECTIONAL_LIGHT_COUNT
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsDir[DIRECTIONAL_LIGHT_COUNT];
    if(shadowEnabled)
    {
        computeShadowOfDirectionalLights(v_WorldPosition, shadowContribsDir);
    }
#endif
    for(int i = 0; i < DIRECTIONAL_LIGHT_COUNT; i++)
    {
        vec3 lightDirection = -directionalLightDirection[i];
        vec3 lightColor = directionalLightColor[i];

        float ndl = dot(v_Normal, normalize(lightDirection));

        float shadowContrib = 1.0;
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
        if( shadowEnabled )
        {
            shadowContrib = shadowContribsDir[i];
        }
#endif

        diffuseColor += lightColor * clamp(ndl, 0.0, 1.0) * shadowContrib;
    }
#endif

#ifdef SPOT_LIGHT_COUNT
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsSpot[SPOT_LIGHT_COUNT];
    if(shadowEnabled)
    {
        computeShadowOfSpotLights(v_WorldPosition, shadowContribsSpot);
    }
#endif
    for(int i = 0; i < SPOT_LIGHT_COUNT; i++)
    {
        vec3 lightPosition = -spotLightPosition[i];
        vec3 spotLightDirection = -normalize( spotLightDirection[i] );
        vec3 lightColor = spotLightColor[i];
        float range = spotLightRange[i];
        float a = spotLightUmbraAngleCosine[i];
        float b = spotLightPenumbraAngleCosine[i];
        float falloffFactor = spotLightFalloffFactor[i];

        vec3 lightDirection = lightPosition - v_WorldPosition;
        // Calculate attenuation
        float dist = length(lightDirection);
        float attenuation = lightAttenuation(dist, range);

        // Normalize light direction
        lightDirection /= dist;
        // Calculate spot light fall off
        float c = dot(spotLightDirection, lightDirection);

        float falloff;
        falloff = clamp((c - a) /( b - a), 0.0, 1.0);
        falloff = pow(falloff, falloffFactor);

        float ndl = dot(v_Normal, lightDirection);
        ndl = clamp(ndl, 0.0, 1.0);

        float shadowContrib = 1.0;
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
        if( shadowEnabled )
        {
            shadowContrib = shadowContribsSpot[i];
        }
#endif
        diffuseColor += lightColor * ndl * attenuation * (1.0-falloff) * shadowContrib;
    }
#endif

    gl_FragColor.rgb *= diffuseColor;
    gl_FragColor.rgb += emission;
    if(lineWidth > 0.)
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