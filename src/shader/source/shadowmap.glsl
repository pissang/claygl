@export clay.sm.depth.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;

uniform vec2 uvRepeat = vec2(1.0, 1.0);
uniform vec2 uvOffset = vec2(0.0, 0.0);

@import clay.chunk.skinning_header

@import clay.chunk.instancing_header

varying vec4 v_ViewPosition;

varying vec2 v_Texcoord;

void main(){

    vec4 P = vec4(position, 1.0);

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
    @import clay.chunk.instancing_matrix
    P = instanceMat * P;
#endif

    v_ViewPosition = worldViewProjection * P;
    gl_Position = v_ViewPosition;

    v_Texcoord = texcoord * uvRepeat + uvOffset;
}
@end

@export clay.sm.depth.fragment

varying vec4 v_ViewPosition;
varying vec2 v_Texcoord;

uniform float bias : 0.001;
uniform float slopeScale : 1.0;

uniform sampler2D alphaMap;
uniform float alphaCutoff: 0.0;

@import clay.util.encode_float

void main(){
    // Whats the difference between gl_FragCoord.z and this v_ViewPosition
    // gl_FragCoord consider the polygon offset ?
    float depth = v_ViewPosition.z / v_ViewPosition.w;
    // float depth = gl_FragCoord.z / gl_FragCoord.w;

    if (alphaCutoff > 0.0) {
        if (texture2D(alphaMap, v_Texcoord).a <= alphaCutoff) {
            discard;
        }
    }

    // Add slope scaled bias using partial derivative
    #ifdef SUPPORT_STANDARD_DERIVATIVES
    float dx = dFdx(depth);
    float dy = dFdy(depth);
    depth += sqrt(dx*dx + dy*dy) * slopeScale + bias;
    #else
    depth += bias;
    #endif

    gl_FragColor = encodeFloat(depth * 0.5 + 0.5);
}
@end

@export clay.sm.debug_depth

uniform sampler2D depthMap;
varying vec2 v_Texcoord;

@import clay.util.decode_float

void main() {
    vec4 tex = texture2D(depthMap, v_Texcoord);
    float depth = decodeFloat(tex);
    gl_FragColor = vec4(depth, depth, depth, 1.0);
}

@end


@export clay.sm.distance.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 world : WORLD;

attribute vec3 position : POSITION;

@import clay.chunk.skinning_header

varying vec3 v_WorldPosition;

void main (){

    vec4 P = vec4(position, 1.0);

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
    @import clay.chunk.instancing_matrix
    P = instanceMat * P;
#endif

    gl_Position = worldViewProjection * P;
    v_WorldPosition = (world * P).xyz;
}

@end

@export clay.sm.distance.fragment

uniform vec3 lightPosition;
uniform float range : 100;

varying vec3 v_WorldPosition;

@import clay.util.encode_float

void main(){
    float dist = distance(lightPosition, v_WorldPosition);
    dist = dist / range;
    gl_FragColor = encodeFloat(dist);
}
@end

@export clay.plugin.shadow_map_common

@import clay.util.decode_float

float tapShadowMap(sampler2D map, vec2 uv, float z){
    vec4 tex = texture2D(map, uv);
    return step(z, decodeFloat(tex) * 2.0 - 1.0);
}

float pcf(sampler2D map, vec2 uv, float z, float textureSize, vec2 scale) {

    float shadowContrib = tapShadowMap(map, uv, z);
    vec2 offset = vec2(1.0 / textureSize) * scale;
#ifdef PCF_KERNEL_SIZE
    for (int _idx_ = 0; _idx_ < PCF_KERNEL_SIZE; _idx_++) {{
        shadowContrib += tapShadowMap(map, uv + offset * pcfKernel[_idx_], z);
    }}

    return shadowContrib / float(PCF_KERNEL_SIZE + 1);
#else
    // TODO Removed in deferred pipeline
    shadowContrib += tapShadowMap(map, uv+vec2(offset.x, 0.0), z);
    shadowContrib += tapShadowMap(map, uv+vec2(offset.x, offset.y), z);
    shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, offset.y), z);
    shadowContrib += tapShadowMap(map, uv+vec2(0.0, offset.y), z);
    shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, 0.0), z);
    shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, -offset.y), z);
    shadowContrib += tapShadowMap(map, uv+vec2(offset.x, -offset.y), z);
    shadowContrib += tapShadowMap(map, uv+vec2(0.0, -offset.y), z);

    return shadowContrib / 9.0;
#endif
}

float pcf(sampler2D map, vec2 uv, float z, float textureSize) {
    return pcf(map, uv, z, textureSize, vec2(1.0));
}

float computeShadowContrib(
    sampler2D map, mat4 lightVPM, vec3 position, float textureSize, vec2 scale, vec2 offset
) {

    vec4 posInLightSpace = lightVPM * vec4(position, 1.0);
    posInLightSpace.xyz /= posInLightSpace.w;
    float z = posInLightSpace.z;
    // In frustum
    if(all(greaterThan(posInLightSpace.xyz, vec3(-0.99, -0.99, -1.0))) &&
        all(lessThan(posInLightSpace.xyz, vec3(0.99, 0.99, 1.0)))){
        // To texture uv
        vec2 uv = (posInLightSpace.xy+1.0) / 2.0;

        return pcf(map, uv * scale + offset, z, textureSize, scale);
    }
    return 1.0;
}

float computeShadowContrib(sampler2D map, mat4 lightVPM, vec3 position, float textureSize) {
    return computeShadowContrib(map, lightVPM, position, textureSize, vec2(1.0), vec2(0.0));
}

float computeShadowContribOmni(samplerCube map, vec3 direction, float range)
{
    float dist = length(direction);
    vec4 shadowTex = textureCube(map, direction);

    return step(dist, (decodeFloat(shadowTex) + 0.0002) * range);
}

@end



@export clay.plugin.compute_shadow_map

#if defined(SPOT_LIGHT_SHADOWMAP_COUNT) || defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT) || defined(POINT_LIGHT_SHADOWMAP_COUNT)

#ifdef SPOT_LIGHT_SHADOWMAP_COUNT
uniform sampler2D spotLightShadowMaps[SPOT_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
uniform mat4 spotLightMatrices[SPOT_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
uniform float spotLightShadowMapSizes[SPOT_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
#endif

#ifdef DIRECTIONAL_LIGHT_SHADOWMAP_COUNT
#if defined(SHADOW_CASCADE)
uniform sampler2D directionalLightShadowMaps[1]:unconfigurable;
uniform mat4 directionalLightMatrices[SHADOW_CASCADE]:unconfigurable;
uniform float directionalLightShadowMapSizes[1]:unconfigurable;
uniform float shadowCascadeClipsNear[SHADOW_CASCADE]:unconfigurable;
uniform float shadowCascadeClipsFar[SHADOW_CASCADE]:unconfigurable;
#else
uniform sampler2D directionalLightShadowMaps[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
uniform mat4 directionalLightMatrices[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
uniform float directionalLightShadowMapSizes[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
#endif
#endif

#ifdef POINT_LIGHT_SHADOWMAP_COUNT
uniform samplerCube pointLightShadowMaps[POINT_LIGHT_SHADOWMAP_COUNT]:unconfigurable;
#endif

uniform bool shadowEnabled : true;

#ifdef PCF_KERNEL_SIZE
uniform vec2 pcfKernel[PCF_KERNEL_SIZE];
#endif

@import clay.plugin.shadow_map_common

#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)

void computeShadowOfSpotLights(vec3 position, inout float shadowContribs[SPOT_LIGHT_COUNT] ) {
    float shadowContrib;
    for(int _idx_ = 0; _idx_ < SPOT_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
        shadowContrib = computeShadowContrib(
            spotLightShadowMaps[_idx_], spotLightMatrices[_idx_], position,
            spotLightShadowMapSizes[_idx_]
        );
        shadowContribs[_idx_] = shadowContrib;
    }}
    // set default fallof of rest lights
    for(int _idx_ = SPOT_LIGHT_SHADOWMAP_COUNT; _idx_ < SPOT_LIGHT_COUNT; _idx_++){{
        shadowContribs[_idx_] = 1.0;
    }}
}

#endif


#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)

#ifdef SHADOW_CASCADE

void computeShadowOfDirectionalLights(vec3 position, inout float shadowContribs[DIRECTIONAL_LIGHT_COUNT]){
    // http://www.opengl.org/wiki/Compute_eye_space_from_window_space
    float depth = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far)
                    / (gl_DepthRange.far - gl_DepthRange.near);

    float shadowContrib;
    // Pixels not in light box are lighted
    // TODO
    shadowContribs[0] = 1.0;

    for (int _idx_ = 0; _idx_ < SHADOW_CASCADE; _idx_++) {{
        if (
            depth >= shadowCascadeClipsNear[_idx_] &&
            depth <= shadowCascadeClipsFar[_idx_]
        ) {
            shadowContrib = computeShadowContrib(
                directionalLightShadowMaps[0], directionalLightMatrices[_idx_], position,
                directionalLightShadowMapSizes[0],
                vec2(1.0 / float(SHADOW_CASCADE), 1.0),
                vec2(float(_idx_) / float(SHADOW_CASCADE), 0.0)
            );
            // TODO Will get a sampler needs to be be uniform error in native gl
            shadowContribs[0] = shadowContrib;
        }
    }}
    // set default fallof of rest lights
    for(int _idx_ = DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_ < DIRECTIONAL_LIGHT_COUNT; _idx_++) {{
        shadowContribs[_idx_] = 1.0;
    }}
}

#else

void computeShadowOfDirectionalLights(vec3 position, inout float shadowContribs[DIRECTIONAL_LIGHT_COUNT]){
    float shadowContrib;

    for(int _idx_ = 0; _idx_ < DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
        shadowContrib = computeShadowContrib(
            directionalLightShadowMaps[_idx_], directionalLightMatrices[_idx_], position,
            directionalLightShadowMapSizes[_idx_]
        );
        shadowContribs[_idx_] = shadowContrib;
    }}
    // set default fallof of rest lights
    for(int _idx_ = DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_ < DIRECTIONAL_LIGHT_COUNT; _idx_++) {{
        shadowContribs[_idx_] = 1.0;
    }}
}
#endif

#endif


#if defined(POINT_LIGHT_SHADOWMAP_COUNT)

void computeShadowOfPointLights(vec3 position, inout float shadowContribs[POINT_LIGHT_COUNT] ){
    vec3 lightPosition;
    vec3 direction;
    for(int _idx_ = 0; _idx_ < POINT_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
        lightPosition = pointLightPosition[_idx_];
        direction = position - lightPosition;
        shadowContribs[_idx_] = computeShadowContribOmni(pointLightShadowMaps[_idx_], direction, pointLightRange[_idx_]);
    }}
    for(int _idx_ = POINT_LIGHT_SHADOWMAP_COUNT; _idx_ < POINT_LIGHT_COUNT; _idx_++) {{
        shadowContribs[_idx_] = 1.0;
    }}
}

#endif

#endif

@end