@export normal.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

uniform vec2 uvRepeat;
uniform vec2 uvOffset;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 normal : NORMAL;

#ifdef SKINNING
attribute vec3 weight : WEIGHT;
attribute vec4 joint : JOINT;

uniform mat4 skinMatrix[JOINT_COUNT] : SKIN_MATRIX;
#endif

varying vec2 v_Texcoord;
varying vec3 v_Normal;

#ifdef NORMALMAP_ENABLED
attribute vec4 tangent : TANGENT;
varying vec3 v_Tangent;
varying vec3 v_Bitangent;
#endif

varying vec4 v_ProjPos;

void main()
{

    vec3 skinnedPosition = position;
    vec3 skinnedNormal = normal;

    bool hasTangent = dot(tangent, tangent) > 0.0;
#ifdef NORMALMAP_ENABLED
    vec3 skinnedTangent = tangent.xyz;
#endif
#ifdef SKINNING

    @import qtek.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
    // Upper skinMatrix
    skinnedNormal = (skinMatrixWS * vec4(normal, 0.0)).xyz;
#ifdef NORMALMAP_ENABLED
    if (hasTangent) {
        skinnedTangent = (skinMatrixWS * vec4(tangent.xyz, 0.0)).xyz;
    }
#endif
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);

    v_Texcoord = texcoord * uvRepeat + uvOffset;

    v_Normal = normalize((worldInverseTranspose * vec4(skinnedNormal, 0.0)).xyz);

#ifdef NORMALMAP_ENABLED
    if (hasTangent) {
        v_Tangent = normalize((worldInverseTranspose * vec4(skinnedTangent, 0.0)).xyz);
        v_Bitangent = normalize(cross(v_Normal, v_Tangent) * tangent.w);
    }
#endif

    v_ProjPos = gl_Position;
}


@end


@export normal.fragment

uniform sampler2D diffuseMap;
uniform float glossiness;

varying vec2 v_Texcoord;
varying vec3 v_Normal;

#ifdef NORMALMAP_ENABLED
uniform sampler2D normalMap;
varying vec3 v_Tangent;
varying vec3 v_Bitangent;
#endif

#ifdef GLOSSMAP_ENABLED
uniform sampler2D glossMap;
#elif defined(ROUGHNESSMAP_ENABLED)
uniform sampler2D roughnessMap;
#endif

uniform bool tintGloss;

varying vec4 v_ProjPos;

void main()
{
    vec3 N = v_Normal;
#ifdef NORMALMAP_ENABLED
    if (dot(v_Tangent, v_Tangent) > 0.0) {
        vec3 normalTexel = texture2D(normalMap, v_Texcoord).xyz;
        if (dot(normalTexel, normalTexel) > 0.0) { // Valid normal map
            N = normalTexel * 2.0 - 1.0;
            mat3 tbn = mat3(v_Tangent, v_Bitangent, v_Normal);
            N = normalize(tbn * N);
        }
    }
#endif

    gl_FragColor.rgb = (N.xyz + 1.0) * 0.5;

    float g = glossiness;
#ifdef GLOSSMAP_ENABLED
    // Ouptut glossiness to alpha channel
    vec4 glossTexel = texture2D(glossMap, v_Texcoord);
    if (tintGloss) {
        g *= glossTexel.r;
    }
    else {
        g = glossTexel.r;
    }
#elif defined(ROUGHNESSMAP_ENABLED)
    vec4 glossTexel = vec4(1.0) - texture2D(roughnessMap, v_Texcoord);
    if (tintGloss) {
        g *= glossTexel.r;
    }
    else {
        g = glossTexel.r;
    }
#endif

    gl_FragColor.a = g;
}
@end