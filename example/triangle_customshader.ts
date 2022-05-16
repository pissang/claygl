import { GLRenderer, GeometryBase, Shader, glsl, setCanvasSize } from 'claygl';

const { uniform, attribute } = Shader;

const TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
const canvas = document.getElementById('main') as HTMLCanvasElement;
setCanvasSize(canvas, 400, 400);
const gl = canvas.getContext('webgl')!;
gl.viewport(0, 0, 400, 400);
const renderer = new GLRenderer(gl);

const geometry = new GeometryBase();
geometry.createAttribute('position', 'float', 3, 'POSITION');
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);

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
  gl_FragColor = vec4(color, 1.0);
}
`
});

const shader = new Shader(vs, fs);
const material = {
  shader,
  uniforms: shader.createUniforms()
};

renderer.render([
  {
    geometry,
    material
  }
]);

const colors = [
  [1, 0, 0],
  [0, 0, 1]
];
let idx = 0;
setInterval(() => {
  idx = 1 - idx;
  material.uniforms.color.value = colors[idx] as [number, number, number];
  renderer.render([
    {
      geometry,
      material
    }
  ]);
}, 1000);
