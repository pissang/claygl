// import { Renderer, GeometryBase, Material, Shader, glsl } from 'claygl';

import GeometryBase from '../src/GeometryBase';
import Material from '../src/Material';
import Renderer from '../src/Renderer';
import Shader, { glsl } from '../src/Shader';

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
    position: Shader.attribute('vec3', 'POSITION')
  },
  main: glsl`
void main() {
  gl_Position = vec4(position, 1.0);
}`
});
const fs = new Shader.Fragment({
  uniforms: {
    color: Shader.uniform('rgb', 'red')
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
