import { GLPipeline, GeometryBase, Shader, glsl, setCanvasSize, Texture2DArray } from 'claygl';

const { uniform, attribute, varying } = Shader;

const canvas = document.getElementById('main') as HTMLCanvasElement;
setCanvasSize(canvas, 400, 400);
const gl = canvas.getContext('webgl2')!;
gl.viewport(0, 0, 400, 400);
const pipeline = new GLPipeline(gl);

const geometry = new GeometryBase();
geometry.createAttribute('position', 'float', 3, 'POSITION');
geometry.createAttribute('textureIndex', 'int', 2);
geometry.attributes.position.fromArray([
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
]);
// It's for testing ivec2
geometry.attributes.textureIndex.fromArray([
  [0, 0],
  [1, 0],
  [0, 1]
]);

const vs = new Shader.Vertex({
  attributes: {
    position: attribute('vec3', 'POSITION'),
    textureIndex: attribute('ivec2')
  },
  varyings: {
    v_TextureIndex: varying('vec2')
  },
  main: glsl`
void main() {
  gl_Position = vec4(position, 1.0);
  v_TextureIndex = vec2(textureIndex);
}`
});
const fs = new Shader.Fragment({
  uniforms: {
    colorTex: uniform('sampler2DArray')
  },
  main: glsl`
void main() {
  vec3 coord = vec3(0.0, 0.0, v_TextureIndex.x);
  out_color = vec4(texture(colorTex, coord).rgb, 1.0);
}`
});

const shader = new Shader(vs, fs);
const uniforms = shader.createUniforms();

function createCanvas(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return canvas;
}

uniforms.colorTex.value = new Texture2DArray({
  image: [createCanvas('red'), createCanvas('green')]
});

function render() {
  pipeline.render([
    {
      geometry,
      material: { shader, uniforms }
    }
  ]);
}

render();
