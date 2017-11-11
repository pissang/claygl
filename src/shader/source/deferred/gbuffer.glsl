@export qtek.deferred.gbuffer.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

uniform vec2 uvRepeat;
uniform vec2 uvOffset;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;

#ifdef FIRST_PASS
attribute vec3 normal : NORMAL;
#endif

@import qtek.chunk.skinning_header


#ifdef FIRST_PASS
varying vec3 v_Normal;

attribute vec4 tangent : TANGENT;
varying vec3 v_Tangent;
varying vec3 v_Bitangent;
varying vec3 v_WorldPosition;
#endif


varying vec2 v_Texcoord;

void main()
{

    vec3 skinnedPosition = position;

#ifdef FIRST_PASS
    vec3 skinnedNormal = normal;
    vec3 skinnedTangent = tangent.xyz;
    bool hasTangent = dot(tangent, tangent) > 0.0;
#endif

#ifdef SKINNING

    @import qtek.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;

    #ifdef FIRST_PASS
    // Upper skinMatrix
    skinnedNormal = (skinMatrixWS * vec4(normal, 0.0)).xyz;
    if (hasTangent) {
        skinnedTangent = (skinMatrixWS * vec4(tangent.xyz, 0.0)).xyz;
    }
    #endif
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);

    v_Texcoord = texcoord * uvRepeat + uvOffset;

#ifdef FIRST_PASS
    v_Normal = normalize((worldInverseTranspose * vec4(skinnedNormal, 0.0)).xyz);

    if (hasTangent) {
        v_Tangent = normalize((worldInverseTranspose * vec4(skinnedTangent, 0.0)).xyz);
        v_Bitangent = normalize(cross(v_Normal, v_Tangent) * tangent.w);
    }
    v_WorldPosition = (world * vec4(skinnedPosition, 1.0)).xyz;
#endif
}


@end


@export qtek.deferred.gbuffer1.fragment

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
varying vec3 v_Tangent;
varying vec3 v_Bitangent;

uniform sampler2D roughGlossMap;

uniform bool useRoughGlossMap;
uniform bool useRoughness;
uniform bool doubleSided;

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

    gl_FragColor.a = g;

    // Pack sign of normal to metalness
    // Add 0.001 to avoid m is 0
    // gl_FragColor.a = sign(N.z) * (m + 0.001) * 0.5 + 0.5;
}
@end

@export qtek.deferred.gbuffer2.fragment

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

varying vec2 v_Texcoord;

@import qtek.util.srgb

void main ()
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

    gl_FragColor.rgb = texel.rgb * color;

    gl_FragColor.a = m;
}

@end


@export qtek.deferred.gbuffer.debug

@import qtek.deferred.chunk.light_head
// DEBUG
// - 0: normal
// - 1: depth
// - 2: position
// - 3: glossiness
// - 4: metalness
// - 5: albedo
uniform int debug: 0;

void main ()
{
    @import qtek.deferred.chunk.gbuffer_read

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
    else {
        gl_FragColor = vec4(albedo, 1.0);
    }
}
@end