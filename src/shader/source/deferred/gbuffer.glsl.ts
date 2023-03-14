import {
  createArrayUniform,
  createAttribute as attribute,
  createSemanticUniform as semanticUniform,
  createUniform as uniform,
  createVarying as varying,
  FragmentShader,
  glsl,
  VertexShader
} from '../../../Shader';
import {
  NORMAL,
  POSITION,
  TANGENT,
  TEXCOORD_0,
  VIEWINVERSE,
  WORLD,
  WORLDINVERSETRANSPOSE,
  WORLDVIEWPROJECTION
} from '../shared';
import { skinningMixin, sRGBMixin } from '../util.glsl';
import { gBufferReadMixin } from './chunk.glsl';

export const gBufferVertex = new VertexShader({
  name: 'gBufferVertex',
  attributes: {
    position: POSITION(),
    texcoord: TEXCOORD_0(),
    normal: NORMAL(),
    tangent: TANGENT()
  },
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION(),
    worldInverseTranspose: WORLDINVERSETRANSPOSE(),
    world: WORLD(),
    prevWorldViewProjection: uniform('mat4'),
    prevSkinMatricesTexture: uniform('sampler2D'),
    prevSkinMatrix: createArrayUniform('mat4', 'JOINT_COUNT'),
    uvRepeat: uniform('vec2'),
    uvOffset: uniform('vec2')
  },
  varyings: {
    v_Texcoord: varying('vec2'),
    v_Normal: varying('vec3'),
    v_Tangent: varying('vec3'),
    v_Bitangent: varying('vec3'),
    v_WorldPosition: varying('vec3'),
    v_ViewPosition: varying('vec4'),
    v_PrevViewPosition: varying('vec4')
  },
  includes: [skinningMixin],
  main: glsl`
#ifdef SKINNING
  #ifdef USE_SKIN_MATRICES_TEXTURE
mat4 getPrevSkinMatrix(float idx) {
  return getSkinMatrix(prevSkinMatricesTexture, idx);
}
  #else
mat4 getPrevSkinMatrix(float idx) {
  return prevSkinMatrix[int(idx)];
}
  #endif
#endif

void main() {
  vec3 skinnedPosition = position;
  vec3 prevSkinnedPosition = position;

#ifdef USE_TARGET_TEXTURE1
  vec3 skinnedNormal = normal;
  vec3 skinnedTangent = tangent.xyz;
  bool hasTangent = dot(tangent, tangent) > 0.0;
#endif

#ifdef SKINNING

  ${skinningMixin.main}

  skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;

  #ifdef USE_TARGET_TEXTURE1
  // Upper skinMatrix
  skinnedNormal = (skinMatrixWS * vec4(normal, 0.0)).xyz;
  if (hasTangent) {
    skinnedTangent = (skinMatrixWS * vec4(tangent.xyz, 0.0)).xyz;
  }
  #endif

  #ifdef USE_TARGET_TEXTURE4
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

#if defined(USE_TARGET_TEXTURE3) || defined(USE_TARGET_TEXTURE1)
  v_Texcoord = texcoord * uvRepeat + uvOffset;
#endif

#ifdef USE_TARGET_TEXTURE1
  v_Normal = normalize((worldInverseTranspose * vec4(skinnedNormal, 0.0)).xyz);

  if (hasTangent) {
    v_Tangent = normalize((worldInverseTranspose * vec4(skinnedTangent, 0.0)).xyz);
    v_Bitangent = normalize(cross(v_Normal, v_Tangent) * tangent.w);
  }
  v_WorldPosition = (world * vec4(skinnedPosition, 1.0)).xyz;
#endif

#ifdef USE_TARGET_TEXTURE4
  v_ViewPosition = worldViewProjection * vec4(skinnedPosition, 1.0);
  v_PrevViewPosition = prevWorldViewProjection * vec4(prevSkinnedPosition, 1.0);
#endif

  gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);

}`
});

/**
 * First texture
 * - R: normal.x
 * - G: normal.y
 * - B: normal.z
 * - A: metalness
 *
 * Second texture
 * - R: albedo.r
 * - G: albedo.g
 * - B: albedo.b
 * - A: metalness
 *
 * Third texture
 * - R: velocity.x
 * - G: velocity.y
 * - A: alpha
 */
export const createGBufferFrag = (outputs: string[]) =>
  new FragmentShader({
    name: 'gBufferFrag',
    outputs: outputs,
    uniforms: {
      viewInverse: VIEWINVERSE(),
      glossiness: uniform('float'),

      diffuseMap: uniform('sampler2D'),
      metalnessMap: uniform('sampler2D'),
      color: uniform('vec3'),
      metalness: uniform('float'),
      useMetalnessMap: uniform('bool'),
      linear: uniform('bool'),

      normalMap: uniform('sampler2D'),
      roughGlossMap: uniform('sampler2D'),
      useRoughGlossMap: uniform('bool'),
      useRoughness: uniform('bool'),

      doubleSided: uniform('bool'),
      alphaCutoff: uniform('float', 0.0),
      alpha: uniform('float', 1.0),

      roughGlossChannel: uniform('int', 0),

      firstRender: uniform('bool')
    },
    includes: [sRGBMixin],
    main: glsl`
float indexingTexel(in vec4 texel, in int idx) {
  if (idx == 3) return texel.a;
  else if (idx == 1) return texel.g;
  else if (idx == 2) return texel.b;
  else return texel.r;
}

void main() {

  float a = alpha * texture(diffuseMap, v_Texcoord).a;
  if (a < alphaCutoff) {
    discard;
  }
#ifdef USE_TARGET_TEXTURE1
  vec3 N = v_Normal;

  if (doubleSided) {
    vec3 eyePos = viewInverse[3].xyz;
    vec3 V = eyePos - v_WorldPosition;
    if (dot(N, V) < 0.0) {
      N = -N;
    }
  }
  if (dot(v_Tangent, v_Tangent) > 0.0) {
    vec3 normalTexel = texture(normalMap, v_Texcoord).xyz;
    if (dot(normalTexel, normalTexel) > 0.0) { // Valid normal map
      N = normalTexel * 2.0 - 1.0;
      mat3 tbn = mat3(v_Tangent, v_Bitangent, v_Normal);
      // FIXME Why need to normalize again?
      N = normalize(tbn * N);
    }
  }


  float g = glossiness;

  if (useRoughGlossMap) {
    float g2 = indexingTexel(texture(roughGlossMap, v_Texcoord), roughGlossChannel);
    if (useRoughness) {
      g2 = 1.0 - g2;
    }
    g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
  }

  // FIXME Have precision problem http://aras-p.info/texts/CompactNormalStorage.html
  // N.z can be recovered from sqrt(1 - dot(N.xy, N.xy));
  // out_color.rg = (N.xy + 1.0) * 0.5;

  // PENDING Alpha can't be zero.
  out_color0 = vec4((N + 1.0) * 0.5, g + 0.005);
#endif

  // Texture 2
#ifdef USE_TARGET_TEXTURE3
  float m = metalness;

  if (useMetalnessMap) {
    vec4 metalnessTexel = texture(metalnessMap, v_Texcoord);
    m = clamp(metalnessTexel.r + (m * 2.0 - 1.0), 0.0, 1.0);
  }
  vec4 texel = texture(diffuseMap, v_Texcoord);
  vec3 albedo = color;
  if (linear) {
    texel = sRGBToLinear(texel);
    albedo = sRGBToLinear(vec4(albedo, 1.0)).rgb;
  }

  out_color1 = vec4(texel.rgb * albedo, m + 0.005);
#endif

#ifdef USE_TARGET_TEXTURE4
  // Velocity
  vec2 cur = v_ViewPosition.xy / v_ViewPosition.w;
  vec2 prev = v_PrevViewPosition.xy / v_PrevViewPosition.w;

  if (firstRender) {
    out_color2 = vec4(0.0, 0.0, 0.0, a);
  }
  else {
    out_color2 = vec4((cur - prev) * 0.5 + 0.5, 0.0, a);
  }
#endif
}`
  });

export const gBufferDebugFragment = new FragmentShader({
  name: 'gBufferDebugFrag',
  uniforms: {
    /**
     * DEBUG
     * - 0: normal
     * - 1: depth
     * - 2: position
     * - 3: glossiness
     * - 4: metalness
     * - 5: albedo
     * - 6: velocity
     */
    debug: uniform('int', 0),

    // gbuffer1, 2, 3 already been in the gBufferReadMixin
    gBufferTexture4: uniform('sampler2D')
  },
  includes: [gBufferReadMixin],
  main: glsl`
void main() {
  ${gBufferReadMixin.main}

  if (debug == 0) {
    out_color = vec4(N, 1.0);
  } else if (debug == 1) {
    out_color = vec4(vec3(z), 1.0);
  } else if (debug == 2) {
    out_color = vec4(position, 1.0);
  } else if (debug == 3) {
    out_color = vec4(vec3(glossiness), 1.0);
  } else if (debug == 4) {
    out_color = vec4(vec3(metalness), 1.0);
  } else if (debug == 5) {
    out_color = vec4(albedo, 1.0);
  } else {
    vec4 color = texture(gBufferTexture4, uv);
    color.rg -= 0.5;
    color.rg *= 2.0;
    out_color = color;
  }
}`
});
