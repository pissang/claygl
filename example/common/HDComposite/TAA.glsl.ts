// Modified from https://github.com/Unity-Technologies/PostProcessing/blob/v2/PostProcessing/Shaders/Builtins/TemporalAntialiasing.shader

import { FragmentShader, Shader, glsl } from 'claygl';
const { uniform } = Shader;

const TAAFragment = new FragmentShader({
  name: 'TAAFrag',
  uniforms: {
    prevTex: uniform('sampler2D'),
    currTex: uniform('sampler2D'),
    velocityTex: uniform('sampler2D'),
    depthTex: uniform('sampler2D'),
    currTexSize: uniform('vec2'),
    velocityTexSize: uniform('vec2'),
    jitterOffset: uniform('vec2'),
    still: uniform('bool'),
    stillBlending: uniform('float', 0.95),
    motionBlending: uniform('float', 0.85),
    sharpness: uniform('float', 0.25),
    motionAmplification: uniform('float', 6000)
  },
  main: glsl`
float Luminance(vec4 color) {
  return dot(color.rgb, vec3(0.2125, 0.7154, 0.0721));
}

float compareDepth(float a, float b) {
  return step(a, b);
}

vec2 GetClosestFragment(vec2 uv) {
  vec2 k = 1.0 / velocityTexSize.xy;

  vec4 neighborhood = vec4(
    texture2D(depthTex, uv - k).r,
    texture2D(depthTex, uv + vec2(k.x, -k.y)).r,
    texture2D(depthTex, uv + vec2(-k.x, k.y)).r,
    texture2D(depthTex, uv + k).r
  );

  vec3 result = vec3(0.0, 0.0, texture2D(depthTex, uv));
  result = mix(result, vec3(-1.0, -1.0, neighborhood.x), compareDepth(neighborhood.x, result.z));
  result = mix(result, vec3( 1.0, -1.0, neighborhood.y), compareDepth(neighborhood.y, result.z));
  result = mix(result, vec3(-1.0,  1.0, neighborhood.z), compareDepth(neighborhood.z, result.z));
  result = mix(result, vec3( 1.0,  1.0, neighborhood.w), compareDepth(neighborhood.w, result.z));

  return (uv + result.xy * k);
}

vec4 ClipToAABB(vec4 color, vec3 minimum, vec3 maximum) {
  // Note: only clips towards aabb center (but fast!)
  vec3 center = 0.5 * (maximum + minimum);
  vec3 extents = 0.5 * (maximum - minimum);

  // This is actually distance, however the keyword is reserved
  vec3 offset = color.rgb - center;

  vec3 ts = abs(extents / (offset + 0.0001));
  float t = clamp(min(min(ts.x, ts.y), ts.z), 0.0, 1.0);
  color.rgb = center + offset * t;
  return color;
}
// Tonemap and untonmap from "High Quality Temporal Supersampling"
vec4 Tonemap(vec4 color) {
  return vec4(color.rgb / (Luminance(color) + 1.0), color.a);
}

vec4 Untonemap(vec4 color) {
  return vec4(color.rgb / max(1.0 - Luminance(color), 0.0001), color.a);
}

void main()
{
  vec2 closest = GetClosestFragment(v_Texcoord);
  vec4 motionTexel = texture2D(velocityTex, closest);

  if (still) {
    gl_FragColor = Untonemap(
      mix(
        Tonemap(texture2D(currTex, v_Texcoord)),
        Tonemap(texture2D(prevTex, v_Texcoord)),
        stillBlending
      )
    );
    return;
  }

  if (motionTexel.a < 0.1) {
    gl_FragColor = texture2D(currTex, v_Texcoord);
    return;
  }

  vec2 motion = motionTexel.rg - 0.5;

  vec2 k = 1.0 / currTexSize.xy;
  vec2 uv = v_Texcoord;

  vec4 color = texture2D(currTex, uv);

  vec4 topLeft = texture2D(currTex, uv - k * 0.5);
  vec4 bottomRight = texture2D(currTex, uv + k * 0.5);

  vec4 corners = 4.0 * (topLeft + bottomRight) - 2.0 * color;

  // Sharpen output
  // TODO will have black pixels.
  // color += (color - (corners * 0.166667)) * 2.718282 * sharpness;
  // color = clamp(color, 0.0, 1.0);

  vec4 average = (corners + color) * 0.142857;

  vec4 history = texture2D(prevTex, v_Texcoord - motion);

  float motionLength = length(motion);
  vec2 luma = vec2(Luminance(average), Luminance(color));
  //float nudge = 4.0 * abs(luma.x - luma.y);
  float nudge = mix(4.0, 0.25, clamp(motionLength * 100.0, 0.0, 1.0)) * abs(luma.x - luma.y);

  vec4 minimum = min(bottomRight, topLeft) - nudge;
  vec4 maximum = max(topLeft, bottomRight) + nudge;

  // Clip history samples
  history = ClipToAABB(history, minimum.xyz, maximum.xyz);

  // Blend method
  float weight = clamp(
    mix(stillBlending, motionBlending, motionLength * motionAmplification),
    motionBlending, stillBlending
  );
  // TODO tonemap before clip aabb will have huge ghosts.
  color = mix(Tonemap(color), Tonemap(history), weight);
  color = Untonemap(clamp(color, 0.0, 1.0));

  gl_FragColor = color;
}`
});

export default TAAFragment;
