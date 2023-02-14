import { GLRenderer, GeometryBase, Shader, glsl, setCanvasSize } from 'claygl';

const { uniform, attribute } = Shader;

const canvas = document.getElementById('main') as HTMLCanvasElement;
setCanvasSize(canvas, 400, 400);
const gl = canvas.getContext('webgl')!;
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
    color: uniform('rgb', [1, 0, 0])
  },
  main: glsl`
void main() {
  out_color = vec4(color, 1.0);
}
`
});

const shader = new Shader(vs, fs);
const uniforms = shader.createUniforms();

let idx = 0;
function render() {
  uniforms.color.value = idx ? [1, 0, 0] : [0, 0, 1];
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
