import {
  VertexShader,
  FragmentShader,
  glsl,
  createVarying as varying,
  createUniform as uniform,
  createArrayUniform as arrayUniform,
  createAttribute as attribute,
  createShaderFunction,
  FUNCTION_NAME_PLACEHOLDER,
  createSemanticUniform as semanticUniform
} from '../Shader';

export const particleVertex = new VertexShader({
  uniforms: {
    worldView: semanticUniform('mat4', 'WORLDVIEW'),
    projection: semanticUniform('mat4', 'PROJECTION')
  },

  attributes: {
    position: attribute('vec3', 'POSITION'),
    normal: attribute('vec3', 'NORMAL'),
    texcoord0: attribute('vec2', 'TEXCOORD_0'),
    texcoord1: attribute('vec2', 'TEXCOORD_1')
  },

  varyings: {
    v_Uv0: varying('vec2'),
    v_Uv1: varying('vec2'),
    v_Age: varying('float')
  },
  main: glsl`
void main() {
  v_Age = normal.x;
  float rotation = normal.y;

  vec4 worldViewPosition = worldView * vec4(position, 1.0);
  gl_Position = projection * worldViewPosition;
  float w = gl_Position.w;
  // TODO
  gl_PointSize = normal.z * projection[0].x / w;

#ifdef UV_ANIMATION
  v_Uv0 = texcoord0;
  v_Uv1 = texcoord1;
#endif
}`
});

export const particleFragment = new FragmentShader({
  uniforms: {
    sprite: uniform('sampler2D'),
    gradient: uniform('sampler2D'),
    color: uniform('vec3', [1.0, 1.0, 1.0]),
    alpha: uniform('float', 1.0)
  },
  main: glsl`
void main() {
  vec4 color = vec4(color, alpha);
#ifdef SPRITE_ENABLED
  #ifdef UV_ANIMATION
  color *= texture2D(sprite, mix(v_Uv0, v_Uv1, gl_PointCoord));
  #else
  color *= texture2D(sprite, gl_PointCoord);
  #endif
#endif
#ifdef GRADIENT_ENABLED
  color *= texture2D(gradient, vec2(v_Age, 0.5));
#endif
  gl_FragColor = color;
}`
});
