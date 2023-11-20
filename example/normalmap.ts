import {
  Renderer,
  Scene,
  CubeGeometry,
  createStandardShader,
  Material,
  Texture2D,
  Mesh,
  DirectionalLight,
  Vector3,
  Camera
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
const scene = new Scene();
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect(),
  far: 500
});
const cube = new CubeGeometry({
  widthSegments: 10,
  heightSegments: 10
});
cube.generateUniqueVertex();
cube.generateTangents();

const material = new Material(createStandardShader());
material.set('normalMap', loadTexture('assets/textures/normal_map.jpg'));
material.set('diffuseMap', loadTexture('assets/textures/diffuse.jpg'));

camera.position.set(0, 0, 4);

const mesh = new Mesh(cube, material);
scene.add(mesh);
const light = new DirectionalLight({
  position: new Vector3(10, 10, 10)
});
light.lookAt(mesh.position);
scene.add(light);

setInterval(function () {
  renderer.render(scene, camera);
  mesh.rotation.rotateY(Math.PI / 500);
}, 20);

function loadTexture(src: string) {
  var texture = new Texture2D();
  texture.load(src);
  return texture;
}
