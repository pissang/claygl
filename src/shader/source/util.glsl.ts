export default '\n@export clay.util.rand\nhighp float rand(vec2 uv) {\n const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n highp float dt = dot(uv.xy, vec2(a,b)), sn = mod(dt, 3.141592653589793);\n return fract(sin(sn) * c);\n}\n@end\n@export clay.util.calculate_attenuation\nuniform float attenuationFactor : 5.0;\nfloat lightAttenuation(float dist, float range)\n{\n float attenuation = 1.0;\n attenuation = dist*dist/(range*range+1.0);\n float att_s = attenuationFactor;\n attenuation = 1.0/(attenuation*att_s+1.0);\n att_s = 1.0/(att_s+1.0);\n attenuation = attenuation - att_s;\n attenuation /= 1.0 - att_s;\n return clamp(attenuation, 0.0, 1.0);\n}\n@end\n@export clay.util.edge_factor\n#ifdef SUPPORT_STANDARD_DERIVATIVES\nfloat edgeFactor(float width)\n{\n vec3 d = fwidth(v_Barycentric);\n vec3 a3 = smoothstep(vec3(0.0), d * width, v_Barycentric);\n return min(min(a3.x, a3.y), a3.z);\n}\n#else\nfloat edgeFactor(float width)\n{\n return 1.0;\n}\n#endif\n@end\n@export clay.util.encode_float\nvec4 encodeFloat(const in float depth)\n{\n const vec4 bitShifts = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);\n const vec4 bit_mask = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);\n vec4 res = fract(depth * bitShifts);\n res -= res.xxyz * bit_mask;\n return res;\n}\n@end\n@export clay.util.decode_float\nfloat decodeFloat(const in vec4 color)\n{\n const vec4 bitShifts = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);\n return dot(color, bitShifts);\n}\n@end\n@export clay.util.float\n@import clay.util.encode_float\n@import clay.util.decode_float\n@end\n@export clay.util.rgbm_decode\nvec3 RGBMDecode(vec4 rgbm, float range) {\n return range * rgbm.rgb * rgbm.a;\n}\n@end\n@export clay.util.rgbm_encode\nvec4 RGBMEncode(vec3 color, float range) {\n if (dot(color, color) == 0.0) {\n return vec4(0.0);\n }\n vec4 rgbm;\n color /= range;\n rgbm.a = clamp(max(max(color.r, color.g), max(color.b, 1e-6)), 0.0, 1.0);\n rgbm.a = ceil(rgbm.a * 255.0) / 255.0;\n rgbm.rgb = color / rgbm.a;\n return rgbm;\n}\n@end\n@export clay.util.rgbm\n@import clay.util.rgbm_decode\n@import clay.util.rgbm_encode\nvec4 decodeHDR(vec4 color)\n{\n#if defined(RGBM_DECODE) || defined(RGBM)\n return vec4(RGBMDecode(color, 8.12), 1.0);\n#else\n return color;\n#endif\n}\nvec4 encodeHDR(vec4 color)\n{\n#if defined(RGBM_ENCODE) || defined(RGBM)\n return RGBMEncode(color.xyz, 8.12);\n#else\n return color;\n#endif\n}\n@end\n@export clay.util.srgb\nvec4 sRGBToLinear(in vec4 value) {\n return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);\n}\nvec4 linearTosRGB(in vec4 value) {\n return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.w);\n}\n@end\n@export clay.chunk.skinning_header\n#ifdef SKINNING\nattribute vec3 weight : WEIGHT;\nattribute vec4 joint : JOINT;\n#ifdef USE_SKIN_MATRICES_TEXTURE\nuniform sampler2D skinMatricesTexture : ignore;\nuniform float skinMatricesTextureSize: ignore;\nmat4 getSkinMatrix(sampler2D tex, float idx) {\n float j = idx * 4.0;\n float x = mod(j, skinMatricesTextureSize);\n float y = floor(j / skinMatricesTextureSize) + 0.5;\n vec2 scale = vec2(skinMatricesTextureSize);\n return mat4(\n texture2D(tex, vec2(x + 0.5, y) / scale),\n texture2D(tex, vec2(x + 1.5, y) / scale),\n texture2D(tex, vec2(x + 2.5, y) / scale),\n texture2D(tex, vec2(x + 3.5, y) / scale)\n );\n}\nmat4 getSkinMatrix(float idx) {\n return getSkinMatrix(skinMatricesTexture, idx);\n}\n#else\nuniform mat4 skinMatrix[JOINT_COUNT] : SKIN_MATRIX;\nmat4 getSkinMatrix(float idx) {\n return skinMatrix[int(idx)];\n}\n#endif\n#endif\n@end\n@export clay.chunk.skin_matrix\nmat4 skinMatrixWS = getSkinMatrix(joint.x) * weight.x;\nif (weight.y > 1e-4)\n{\n skinMatrixWS += getSkinMatrix(joint.y) * weight.y;\n}\nif (weight.z > 1e-4)\n{\n skinMatrixWS += getSkinMatrix(joint.z) * weight.z;\n}\nfloat weightW = 1.0-weight.x-weight.y-weight.z;\nif (weightW > 1e-4)\n{\n skinMatrixWS += getSkinMatrix(joint.w) * weightW;\n}\n@end\n@export clay.chunk.instancing_header\n#ifdef INSTANCING\nattribute vec4 instanceMat1;\nattribute vec4 instanceMat2;\nattribute vec4 instanceMat3;\n#endif\n@end\n@export clay.chunk.instancing_matrix\nmat4 instanceMat = mat4(\n vec4(instanceMat1.xyz, 0.0),\n vec4(instanceMat2.xyz, 0.0),\n vec4(instanceMat3.xyz, 0.0),\n vec4(instanceMat1.w, instanceMat2.w, instanceMat3.w, 1.0)\n);\n@end\n@export clay.util.parallax_correct\nvec3 parallaxCorrect(in vec3 dir, in vec3 pos, in vec3 boxMin, in vec3 boxMax) {\n vec3 first = (boxMax - pos) / dir;\n vec3 second = (boxMin - pos) / dir;\n vec3 further = max(first, second);\n float dist = min(further.x, min(further.y, further.z));\n vec3 fixedPos = pos + dir * dist;\n vec3 boxCenter = (boxMax + boxMin) * 0.5;\n return normalize(fixedPos - boxCenter);\n}\n@end\n@export clay.util.clamp_sample\nvec4 clampSample(const in sampler2D texture, const in vec2 coord)\n{\n#ifdef STEREO\n float eye = step(0.5, coord.x) * 0.5;\n vec2 coordClamped = clamp(coord, vec2(eye, 0.0), vec2(0.5 + eye, 1.0));\n#else\n vec2 coordClamped = clamp(coord, vec2(0.0), vec2(1.0));\n#endif\n return texture2D(texture, coordClamped);\n}\n@end\n@export clay.util.ACES\nvec3 ACESToneMapping(vec3 color)\n{\n const float A = 2.51;\n const float B = 0.03;\n const float C = 2.43;\n const float D = 0.59;\n const float E = 0.14;\n return (color * (A * color + B)) / (color * (C * color + D) + E);\n}\n@end\n@export clay.util.logdepth_vertex_header\n#ifdef LOG_DEPTH\n#ifdef SUPPORT_FRAG_DEPTH\nvarying float v_FragDepth;\n#else\nuniform float logDepthBufFC: LOG_DEPTH_BUFFER_FC;\n#endif\n#endif\n@end\n@export clay.util.logdepth_vertex_main\n#ifdef LOG_DEPTH\n #ifdef SUPPORT_FRAG_DEPTH\n v_FragDepth = 1.0 + gl_Position.w;\n #else\n gl_Position.z = log2(max(1e-6, gl_Position.w + 1.0)) * logDepthBufFC - 1.0;\n gl_Position.z *= gl_Position.w;\n #endif\n#endif\n@end\n@export clay.util.logdepth_fragment_header\n#if defined(LOG_DEPTH) && defined(SUPPORT_FRAG_DEPTH)\nvarying float v_FragDepth;\nuniform float logDepthBufFC : LOG_DEPTH_BUFFER_FC;\n#endif\n@end\n@export clay.util.logdepth_fragment_main\n#if defined(LOG_DEPTH) && defined(SUPPORT_FRAG_DEPTH)\n gl_FragDepthEXT = log2(v_FragDepth) * logDepthBufFC * 0.5;\n#endif\n@end\n';
