import { Renderer, GeometryBase, Material, Shader, glsl } from 'claygl';

const { uniform, attribute } = Shader;

const TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
const renderer = new Renderer({ canvas: document.getElementById('main') as HTMLCanvasElement });
renderer.resize(400, 400);

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
    color: uniform('rgb', 'red')
  },
  main: glsl`
void main() {
  gl_FragColor = vec4(color, 1.0);
}
`
});

const material = new Material(new Shader(vs, fs));

renderer.renderPass([
  {
    geometry,
    material
  }
]);
