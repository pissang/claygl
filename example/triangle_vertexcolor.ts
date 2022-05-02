import {
  BasicShader,
  Material,
  Mesh,
  OrthographicCamera,
  Renderer,
  Scene,
  StaticGeometry
} from 'claygl';

var TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
var VERTEX_COLORS = [
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1]
];

var renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(400, 400);
var scene = new Scene();
var camera = new OrthographicCamera();
var geometry = new StaticGeometry();

// Add triangle vertices to position attribute.
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);
geometry.attributes.color.fromArray(VERTEX_COLORS);

var mesh = new Mesh({
  geometry: geometry,
  material: new Material({
    shader: new BasicShader()
  })
});
mesh.material.define('both', 'VERTEX_COLOR');
mesh.material.set('color', [1, 1, 1]);
scene.add(mesh);

renderer.render(scene, camera);
