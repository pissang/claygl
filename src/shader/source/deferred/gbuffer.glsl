@export clay.deferred.gbuffer.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

#if defined(SECOND_PASS) || defined(FIRST_PASS)
attribute vec2 texcoord : TEXCOORD_0;
uniform vec2 uvRepeat;
uniform vec2 uvOffset;
varying vec2 v_Texcoord;
#endif

#ifdef FIRST_PASS
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

varying vec3 v_Normal;

attribute vec3 normal : NORMAL;
attribute vec4 tangent : TANGENT;

varying vec3 v_Tangent;
varying vec3 v_Bitangent;
varying vec3 v_WorldPosition;

#endif

@import clay.chunk.skinning_header

#ifdef THIRD_PASS
uniform mat4 prevWorldViewProjection;
varying vec4 v_ViewPosition;
varying vec4 v_PrevViewPosition;
#ifdef SKINNING
#ifdef USE_SKIN_MATRICES_TEXTURE
uniform sampler2D prevSkinMatricesTexture;
mat4 getPrevSkinMatrix(float idx) {
    return getSkinMatrix(prevSkinMatricesTexture, idx);
}
#else
uniform mat4 prevSkinMatrix[JOINT_COUNT];
mat4 getPrevSkinMatrix(float idx) {
    return prevSkinMatrix[int(idx)];
}
#endif
#endif

#endif


void main()
{
    vec3 skinnedPosition = position;
    vec3 prevSkinnedPosition = position;

#ifdef FIRST_PASS
    vec3 skinnedNormal = normal;
    vec3 skinnedTangent = tangent.xyz;
    bool hasTangent = dot(tangent, tangent) > 0.0;
#endif

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;

    #ifdef FIRST_PASS
    // Upper skinMatrix
    skinnedNormal = (skinMatrixWS * vec4(normal, 0.0)).xyz;
    if (hasTangent) {
        skinnedTangent = (skinMatrixWS * vec4(tangent.xyz, 0.0)).xyz;
    }
    #endif

    #ifdef THIRD_PASS
    // Weighted Sum Skinning Matrix
    // PENDING Must be assigned.
    {
        mat4 prevSkinMatrixWS = getPrevSkinMatrix(joint.x) * weight.x;
        if (weight.y > 1e-4) { prevSkinMatrixWS += getPrevSkinMatrix(joint.y) * weight.y; }
        if (weight.z > 1e-4) { prevSkinMatrixWS += getPrevSkinMatrix(joint.z) * weight.z; }
        float weightW = 1.0-weight.x-weight.y-weight.z;
        if (weightW > 1e-4) { prevSkinMatrixWS += getPrevSkinMatrix(joint.w) * weightW; }
        prevSkinnedPosition = (prevSkinMatrixWS * vec4(position, 1.0)).xyz;
    }
    #endif

#endif

#if defined(SECOND_PASS) || defined(FIRST_PASS)
    v_Texcoord = texcoord * uvRepeat + uvOffset;
#endif

#ifdef FIRST_PASS
    v_Normal = normalize((worldInverseTranspose * vec4(skinnedNormal, 0.0)).xyz);

    if (hasTangent) {
        v_Tangent = normalize((worldInverseTranspose * vec4(skinnedTangent, 0.0)).xyz);
        v_Bitangent = normalize(cross(v_Normal, v_Tangent) * tangent.w);
    }
    v_WorldPosition = (world * vec4(skinnedPosition, 1.0)).xyz;
#endif

#ifdef THIRD_PASS
    v_ViewPosition = worldViewProjection * vec4(skinnedPosition, 1.0);
    v_PrevViewPosition = prevWorldViewProjection * vec4(prevSkinnedPosition, 1.0);
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);

}


@end


@export clay.deferred.gbuffer1.fragment

uniform mat4 viewInverse : VIEWINVERSE;

// First pass
// - R: normal.x
// - G: normal.y
// - B: normal.z
// - A: metalness
uniform float glossiness;

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

uniform sampler2D normalMap;
uniform sampler2D diffuseMap;
varying vec3 v_Tangent;
varying vec3 v_Bitangent;

uniform sampler2D roughGlossMap;

uniform bool useRoughGlossMap;
uniform bool useRoughness;
uniform bool doubleSided;

uniform float alphaCutoff: 0.0;
uniform float alpha: 1.0;

uniform int roughGlossChannel: 0;

float indexingTexel(in vec4 texel, in int idx) {
    if (idx == 3) return texel.a;
    else if (idx == 1) return texel.g;
    else if (idx == 2) return texel.b;
    else return texel.r;
}

void main()
{

    vec3 N = v_Normal;

    if (doubleSided) {
        vec3 eyePos = viewInverse[3].xyz;
        vec3 V = eyePos - v_WorldPosition;
        if (dot(N, V) < 0.0) {
            N = -N;
        }
    }
    if (alphaCutoff > 0.0) {
        float a = texture2D(diffuseMap, v_Texcoord).a * alpha;
        if (a < alphaCutoff) {
            discard;
        }
    }

    if (dot(v_Tangent, v_Tangent) > 0.0) {
        vec3 normalTexel = texture2D(normalMap, v_Texcoord).xyz;
        if (dot(normalTexel, normalTexel) > 0.0) { // Valid normal map
            N = normalTexel * 2.0 - 1.0;
            mat3 tbn = mat3(v_Tangent, v_Bitangent, v_Normal);
            // FIXME Why need to normalize again?
            N = normalize(tbn * N);
        }
    }

    gl_FragColor.rgb = (N + 1.0) * 0.5;

    // FIXME Have precision problem http://aras-p.info/texts/CompactNormalStorage.html
    // N.z can be recovered from sqrt(1 - dot(N.xy, N.xy));
    // gl_FragColor.rg = (N.xy + 1.0) * 0.5;

    float g = glossiness;

    if (useRoughGlossMap) {
        float g2 = indexingTexel(texture2D(roughGlossMap, v_Texcoord), roughGlossChannel);
        if (useRoughness) {
            g2 = 1.0 - g2;
        }
        g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
    }

    // PENDING Alpha can't be zero.
    gl_FragColor.a = g + 0.005;

    // Pack sign of normal to metalness
    // Add 0.001 to avoid m is 0
    // gl_FragColor.a = sign(N.z) * (m + 0.001) * 0.5 + 0.5;
}
@end

@export clay.deferred.gbuffer2.fragment

// Second pass
// - R: albedo.r
// - G: albedo.g
// - B: albedo.b
// - A: metalness
uniform sampler2D diffuseMap;
uniform sampler2D metalnessMap;

uniform vec3 color;
uniform float metalness;

uniform bool useMetalnessMap;
uniform bool linear;

uniform float alphaCutoff: 0.0;
uniform float alpha: 1.0;

varying vec2 v_Texcoord;

@import clay.util.srgb

void main()
{
    float m = metalness;

    if (useMetalnessMap) {
        vec4 metalnessTexel = texture2D(metalnessMap, v_Texcoord);
        m = clamp(metalnessTexel.r + (m * 2.0 - 1.0), 0.0, 1.0);
    }
    vec4 texel = texture2D(diffuseMap, v_Texcoord);
    if (linear) {
        texel = sRGBToLinear(texel);
    }
    if (alphaCutoff > 0.0) {
        float a = texel.a * alpha;
        if (a < alphaCutoff) {
            discard;
        }
    }

    gl_FragColor.rgb = texel.rgb * color;

    // PENDING Alpha can't be zero.
    gl_FragColor.a = m + 0.005;
}

@end


@export clay.deferred.gbuffer3.fragment

uniform bool firstRender;

varying vec4 v_ViewPosition;
varying vec4 v_PrevViewPosition;

void main()
{
    vec2 a = v_ViewPosition.xy / v_ViewPosition.w;
    vec2 b = v_PrevViewPosition.xy / v_PrevViewPosition.w;

    if (firstRender) {
        gl_FragColor = vec4(0.0);
    }
    else {
        gl_FragColor = vec4((a - b) * 0.5 + 0.5, 0.0, 1.0);
    }
}

@end



@export clay.deferred.gbuffer.debug

@import clay.deferred.chunk.light_head

uniform sampler2D gBufferTexture4;
// DEBUG
// - 0: normal
// - 1: depth
// - 2: position
// - 3: glossiness
// - 4: metalness
// - 5: albedo
// - 6: velocity
uniform int debug: 0;

void main ()
{
    @import clay.deferred.chunk.gbuffer_read

    if (debug == 0) {
        gl_FragColor = vec4(N, 1.0);
    }
    else if (debug == 1) {
        gl_FragColor = vec4(vec3(z), 1.0);
    }
    else if (debug == 2) {
        gl_FragColor = vec4(position, 1.0);
    }
    else if (debug == 3) {
        gl_FragColor = vec4(vec3(glossiness), 1.0);
    }
    else if (debug == 4) {
        gl_FragColor = vec4(vec3(metalness), 1.0);
    }
    else if (debug == 5) {
        gl_FragColor = vec4(albedo, 1.0);
    }
    else {
        vec4 color = texture2D(gBufferTexture4, uv);
        color.rg -= 0.5;
        color.rg *= 2.0;
        gl_FragColor = color;
    }
}
@end