// https://github.com/playdeadgames/temporal/blob/master/Assets/Shaders/TemporalReprojection.shader

import { FragmentShader, Shader, glsl } from 'claygl';
const { uniform } = Shader;

const TAAFragment = new FragmentShader({
  name: 'TAAFrag',
  defines: {
    FLT_EPS: 0.00000001,
    MINMAX_3X3: null,
    USE_CLIPPING: null,
    USE_YCOCG: null,
    USE_DILATION: null
  },
  uniforms: {
    prevTex: uniform('sampler2D'),
    currTex: uniform('sampler2D'),
    velocityTex: uniform('sampler2D'),
    depthTex: uniform('sampler2D'),

    still: uniform('bool'),

    sinTime: uniform('float'),

    motionScale: uniform('float', 0.1),
    feedbackMin: uniform('float', 0.88),
    feedbackMax: uniform('float', 0.97),

    projection: uniform('mat4'),

    currTexSize: uniform('vec2'),
    velocityTexSize: uniform('vec2')
  },
  main: glsl`
const vec3 w = vec3(0.2125, 0.7154, 0.0721);

float depth_resolve_linear(float depth) {

  if (projection[3][3] == 0.0) {
    // Perspective
    return projection[3][2] / (depth * projection[2][3] - projection[2][2]);
  }
  else {
    // Symmetrical orthographic
    // PENDING
    return (depth - projection[3][2]) / projection[2][2];
  }
}

vec3 find_closest_fragment_3x3(vec2 uv)
{
	vec2 dd = abs(velocityTexSize.xy);
	vec2 du = vec2(dd.x, 0.0);
	vec2 dv = vec2(0.0, dd.y);

	vec3 dtl = vec3(-1, -1, texture2D(depthTex, uv - dv - du).x);
	vec3 dtc = vec3( 0, -1, texture2D(depthTex, uv - dv).x);
	vec3 dtr = vec3( 1, -1, texture2D(depthTex, uv - dv + du).x);

	vec3 dml = vec3(-1, 0, texture2D(depthTex, uv - du).x);
	vec3 dmc = vec3( 0, 0, texture2D(depthTex, uv).x);
	vec3 dmr = vec3( 1, 0, texture2D(depthTex, uv + du).x);

	vec3 dbl = vec3(-1, 1, texture2D(depthTex, uv + dv - du).x);
	vec3 dbc = vec3( 0, 1, texture2D(depthTex, uv + dv).x);
	vec3 dbr = vec3( 1, 1, texture2D(depthTex, uv + dv + du).x);

	vec3 dmin = dtl;
	if (dmin.z > dtc.z) dmin = dtc;
	if (dmin.z > dtr.z) dmin = dtr;

	if (dmin.z > dml.z) dmin = dml;
	if (dmin.z > dmc.z) dmin = dmc;
	if (dmin.z > dmr.z) dmin = dmr;

	if (dmin.z > dbl.z) dmin = dbl;
	if (dmin.z > dbc.z) dmin = dbc;
	if (dmin.z > dbr.z) dmin = dbr;

	return vec3(uv + dd.xy * dmin.xy, dmin.z);
}
//note: normalized random, float=[0;1[
float PDnrand( vec2 n ) {
	return fract( sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453 );
}
vec2 PDnrand2( vec2 n ) {
	return fract( sin(dot(n.xy, vec2(12.9898, 78.233)))* vec2(43758.5453, 28001.8384) );
}
vec3 PDnrand3( vec2 n ) {
	return fract( sin(dot(n.xy, vec2(12.9898, 78.233)))* vec3(43758.5453, 28001.8384, 50849.4141 ) );
}
vec4 PDnrand4( vec2 n ) {
	return fract( sin(dot(n.xy, vec2(12.9898, 78.233)))* vec4(43758.5453, 28001.8384, 50849.4141, 12996.89) );
}

//====
//note: signed random, float=[-1;1[
float PDsrand( vec2 n ) {
	return PDnrand( n ) * 2.0 - 1.0;
}
vec2 PDsrand2( vec2 n ) {
	return PDnrand2( n ) * 2.0 - 1.0;
}
vec3 PDsrand3( vec2 n ) {
	return PDnrand3( n ) * 2.0 - 1.0;
}
vec4 PDsrand4( vec2 n ) {
	return PDnrand4( n ) * 2.0 - 1.0;
}
// https://software.intel.com/en-us/node/503873
vec3 RGB_YCoCg(vec3 c) {
  // Y = R/4 + G/2 + B/4
  // Co = R/2 - B/2
  // Cg = -R/4 + G/2 - B/4
  return vec3(
    c.x/4.0 + c.y/2.0 + c.z/4.0,
    c.x/2.0 - c.z/2.0,
    -c.x/4.0 + c.y/2.0 - c.z/4.0
  );
}

// https://software.intel.com/en-us/node/503873
vec3 YCoCg_RGB(vec3 c) {
  // R = Y + Co - Cg
  // G = Y + Cg
  // B = Y - Co - Cg
  return clamp(vec3(
    c.x + c.y - c.z,
    c.x + c.z,
    c.x - c.y - c.z
  ), vec3(0.0), vec3(1.0));
}

vec4 sample_color(sampler2D tex, vec2 uv) {
#ifdef USE_YCOCG
  vec4 c = texture2D(tex, uv);
  return vec4(RGB_YCoCg(c.rgb), c.a);
#else
  return texture2D(tex, uv);
#endif
}

vec4 resolve_color(vec4 c)
{
#ifdef USE_YCOCG
  return vec4(YCoCg_RGB(c.rgb).rgb, c.a);
#else
  return c;
#endif
}

vec4 clip_aabb(vec3 aabb_min, vec3 aabb_max, vec4 p, vec4 q) {
// #ifdef USE_OPTIMIZATIONS
  // note: only clips towards aabb center (but fast!)
  vec3 p_clip = 0.5 * (aabb_max + aabb_min);
  vec3 e_clip = 0.5 * (aabb_max - aabb_min) + FLT_EPS;

  vec4 v_clip = q - vec4(p_clip, p.w);
  vec3 v_unit = v_clip.xyz / e_clip;
  vec3 a_unit = abs(v_unit);
  float ma_unit = max(a_unit.x, max(a_unit.y, a_unit.z));

  if (ma_unit > 1.0)
    return vec4(p_clip, p.w) + v_clip / ma_unit;
  else
    return q;// point inside aabb
// #else
//     vec4 r = q - p;
//     vec3 rmax = aabb_max - p.xyz;
//     vec3 rmin = aabb_min - p.xyz;

//     const float eps = FLT_EPS;

//     if (r.x > rmax.x + eps)
//         r *= (rmax.x / r.x);
//     if (r.y > rmax.y + eps)
//         r *= (rmax.y / r.y);
//     if (r.z > rmax.z + eps)
//         r *= (rmax.z / r.z);

//     if (r.x < rmin.x - eps)
//         r *= (rmin.x / r.x);
//     if (r.y < rmin.y - eps)
//         r *= (rmin.y / r.y);
//     if (r.z < rmin.z - eps)
//         r *= (rmin.z / r.z);

//     return p + r;
// #endif
}

// vec2 sample_velocity_dilated(sampler2D tex, vec2 uv, int support)
// {
//     vec2 du = vec2(currTexSize.x, 0.0);
//     vec2 dv = vec2(0.0, currTexSize.y);
//     vec2 mv = vec2(0.0);
//     float rmv = 0.0;

//     int end = support + 1;
//     for (int i = -support; i != end; i++)
//     {
//         for (int j = -support; j != end; j++)
//         {
//             vec2 v = texture2D(tex, uv + i * dv + j * du).xy;
//             float rv = dot(v, v);
//             if (rv > rmv)
//             {
//                 mv = v;
//                 rmv = rv;
//             }
//         }
//     }

//     return mv;
// }

vec4 sample_color_motion(sampler2D tex, vec2 uv, vec2 ss_vel) {
  vec2 v = 0.5 * ss_vel;

  float srand = PDsrand(uv + vec2(sinTime));
  vec2 vtap = v / 3.0;
  vec2 pos0 = uv + vtap * (0.5 * srand);
  vec4 accu = vec4(0.0);
  float wsum = 0.0;

  for (int i = -3; i <= 3; i++) {
    float w = 1.0;// box
    //float w = taps - abs(i) + 1;// triangle
    //float w = 1.0 / (1 + abs(i));// pointy triangle
    accu += w * sample_color(tex, pos0 + float(i) * vtap);
    wsum += w;
  }

  return accu / wsum;
}

vec4 temporal_reprojection(vec2 ss_txc, vec2 ss_vel, float vs_dist)
{
  vec4 texel0 = sample_color(currTex, ss_txc);
  vec4 texel1 = sample_color(prevTex, ss_txc - ss_vel);

  // calc min-max of current neighbourhood
  vec2 uv = ss_txc;

#if defined(MINMAX_3X3) || defined(MINMAX_3X3_ROUNDED)

  vec2 du = vec2(currTexSize.x, 0.0);
  vec2 dv = vec2(0.0, currTexSize.y);

  vec4 ctl = sample_color(currTex, uv - dv - du);
  vec4 ctc = sample_color(currTex, uv - dv);
  vec4 ctr = sample_color(currTex, uv - dv + du);
  vec4 cml = sample_color(currTex, uv - du);
  vec4 cmc = sample_color(currTex, uv);
  vec4 cmr = sample_color(currTex, uv + du);
  vec4 cbl = sample_color(currTex, uv + dv - du);
  vec4 cbc = sample_color(currTex, uv + dv);
  vec4 cbr = sample_color(currTex, uv + dv + du);

  vec4 cmin = min(ctl, min(ctc, min(ctr, min(cml, min(cmc, min(cmr, min(cbl, min(cbc, cbr))))))));
  vec4 cmax = max(ctl, max(ctc, max(ctr, max(cml, max(cmc, max(cmr, max(cbl, max(cbc, cbr))))))));

  #if defined(MINMAX_3X3_ROUNDED) || defined(USE_YCOCG) || defined(USE_CLIPPING)
  vec4 cavg = (ctl + ctc + ctr + cml + cmc + cmr + cbl + cbc + cbr) / 9.0;
  #endif

  #ifdef MINMAX_3X3_ROUNDED
  vec4 cmin5 = min(ctc, min(cml, min(cmc, min(cmr, cbc))));
  vec4 cmax5 = max(ctc, max(cml, max(cmc, max(cmr, cbc))));
  vec4 cavg5 = (ctc + cml + cmc + cmr + cbc) / 5.0;
  cmin = 0.5 * (cmin + cmin5);
  cmax = 0.5 * (cmax + cmax5);
  cavg = 0.5 * (cavg + cavg5);
  #endif

#elif defined(MINMAX_4TAP_VARYING)// this is the method used in v2 (PDTemporalReprojection2)

  const float _SubpixelThreshold = 0.5;
  const float _GatherBase = 0.5;
  const float _GatherSubpixelMotion = 0.1666;

  vec2 texel_vel = ss_vel / velocityTexSize.xy;
  float texel_vel_mag = length(texel_vel) * vs_dist;
  float k_subpixel_motion = clamp(_SubpixelThreshold / (FLT_EPS + texel_vel_mag), 0.0, 1.0);
  float k_min_max_support = _GatherBase + _GatherSubpixelMotion * k_subpixel_motion;

  vec2 ss_offset01 = k_min_max_support * vec2(-currTexSize.x, currTexSize.y);
  vec2 ss_offset11 = k_min_max_support * vec2(currTexSize.x, currTexSize.y);
  vec4 c00 = sample_color(currTex, uv - ss_offset11);
  vec4 c10 = sample_color(currTex, uv - ss_offset01);
  vec4 c01 = sample_color(currTex, uv + ss_offset01);
  vec4 c11 = sample_color(currTex, uv + ss_offset11);

  vec4 cmin = min(c00, min(c10, min(c01, c11)));
  vec4 cmax = max(c00, max(c10, max(c01, c11)));

  #if defined(USE_YCOCG) || defined(USE_CLIPPING)
    vec4 cavg = (c00 + c10 + c01 + c11) / 4.0;
  #endif
#endif

    // shrink chroma min-max
#ifdef USE_YCOCG
  vec2 chroma_extent = vec2(0.25 * 0.5 * (cmax.r - cmin.r));
  vec2 chroma_center = texel0.gb;
  cmin.yz = chroma_center - chroma_extent;
  cmax.yz = chroma_center + chroma_extent;
  cavg.yz = chroma_center;
#endif
  // clamp to neighbourhood of current sample
#ifdef USE_CLIPPING
  texel1 = clip_aabb(cmin.xyz, cmax.xyz, clamp(cavg, cmin, cmax), texel1);
#else
  texel1 = clamp(texel1, cmin, cmax);
#endif

    // feedback weight from unbiased luminance diff (t.lottes)
#ifdef USE_YCOCG
  float lum0 = texel0.r;
  float lum1 = texel1.r;
#else
  float lum0 = dot(texel0.rgb, w);
  float lum1 = dot(texel1.rgb, w);
#endif
  float unbiased_diff = abs(lum0 - lum1) / max(lum0, max(lum1, 0.2));
  float unbiased_weight = 1.0 - unbiased_diff;
  float unbiased_weight_sqr = unbiased_weight * unbiased_weight;
  float k_feedback = mix(feedbackMin, feedbackMax, unbiased_weight_sqr);

  // output
  return mix(texel0, texel1, k_feedback);
}

void main() {
  vec2 uv = v_Texcoord;

  if (still) {
    gl_FragColor = mix(texture2D(currTex, uv), texture2D(prevTex, uv), 0.9);
    return;
  }

#ifdef USE_DILATION
  //--- 3x3 norm (sucks)
  //vec2 ss_vel = sample_velocity_dilated(velocityTex, uv, 1);
  //float vs_dist = depth_sample_linear(uv);

  //--- 5 tap nearest (decent)
  //vec3 c_frag = find_closest_fragment_5tap(uv);
  //vec2 ss_vel = texture2D(velocityTex, c_frag.xy).xy;
  //float vs_dist = depth_resolve_linear(c_frag.z);

  //--- 3x3 nearest (good)
  vec3 c_frag = find_closest_fragment_3x3(uv);
  vec4 velTexel = texture2D(velocityTex, c_frag.xy);
  float vs_dist = depth_resolve_linear(c_frag.z);
#else
  vec4 velTexel = texture2D(velocityTex, uv);
  float depth = texture2D(depthTex, uv).r;
  float vs_dist = depth_resolve_linear(depth);
#endif
  // Remove pixels moved too far.
  if (length(velTexel.rg - 0.5) > 0.5 || velTexel.a < 0.1) {
    gl_FragColor = texture2D(currTex, uv);
    return;
  }
  vec2 ss_vel = velTexel.rg - 0.5;

  // temporal resolve
  vec4 color_temporal = temporal_reprojection(v_Texcoord, ss_vel, vs_dist);

  //// NOTE: velocity debug
  //to_screen.g += 100.0 * length(ss_vel);
  //to_screen = vec4(100.0 * abs(ss_vel), 0.0, 0.0);

#ifdef USE_MOTION_BLUR
  #ifdef USE_MOTION_BLUR_NEIGHBORMAX
  ss_vel = motionScale * tex2D(_VelocityNeighborMax, v_Texcoord).xy;
  #else
  ss_vel = motionScale * ss_vel;
  #endif

  float vel_mag = length(ss_vel / currTexSize);
  const float vel_trust_full = 2.0;
  const float vel_trust_none = 15.0;
  const float vel_trust_span = vel_trust_none - vel_trust_full;
  float trust = 1.0 - clamp(vel_mag - vel_trust_full, 0.0, vel_trust_span) / vel_trust_span;

  vec4 color_motion = sample_color_motion(currTex, v_Texcoord, ss_vel);

  gl_FragColor = resolve_color(mix(color_motion, color_temporal, trust));
#else
  // add noise
  vec4 noise4 = PDsrand4(v_Texcoord + sinTime + 0.6959174) / 510.0;
  gl_FragColor = clamp(resolve_color(color_temporal) + noise4, vec4(0.0), vec4(1.0));
#endif
  // gl_FragColor = vec4(vec3(texture2D(depthTex, v_Texcoord).r), 1.0);
}`
});

export default TAAFragment;
