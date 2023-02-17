import {
  GLRenderer,
  GeometryBase,
  Shader,
  glsl,
  setCanvasSize,
  Texture2DArray,
  constants
} from 'claygl';

const { uniform, attribute } = Shader;

const canvas = document.getElementById('main') as HTMLCanvasElement;
setCanvasSize(canvas, 400, 400);
const gl = canvas.getContext('webgl2')!;
gl.viewport(0, 0, 400, 400);
const renderer = new GLRenderer(gl);

const geometry = new GeometryBase();
geometry.createAttribute('position', 'float', 3, 'POSITION');
geometry.attributes.position.fromArray([
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
]);

const vs = new Shader.Vertex({
  attributes: {
    position: attribute('vec3', 'POSITION')
  },
  main: glsl`
void main() {
  gl_Position = vec4(position, 1.0);
}`
});
const fs = new Shader.Fragment({
  uniforms: {
    colorTex: uniform('sampler2DArray'),
    index: uniform('int')
  },
  main: glsl`
void main() {
  out_color = vec4(texture(colorTex, vec3(0.0, 0.0,float(index))).rgb, 1.0);
}`
});

const shader = new Shader(vs, fs);
const uniforms = shader.createUniforms();

function createCanvas(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

uniforms.colorTex.value = new Texture2DArray({
  image: [createCanvas('red'), createCanvas('green')],
  useMipmap: false,
  minFilter: constants.LINEAR
});

let idx = 0;
function render() {
  uniforms.index.value = idx % 2;
  renderer.render([
    {
      geometry,
      material: { shader, uniforms }
    }
  ]);
  idx = 1 - idx;
}

setInterval(render, 500);
render();
