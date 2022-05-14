import {
  Renderer,
  Scene,
  PerspectiveCamera,
  CubeGeometry,
  createStandardShader,
  Material,
  Texture2D,
  Mesh,
  DirectionalLight,
  Vector3
} from 'claygl';
import dat from 'dat.gui';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
const scene = new Scene();
const camera = new PerspectiveCamera({
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
material.set('parallaxOcclusionMap', loadTexture('assets/textures/depth.png'));
material.set('diffuseMap', loadTexture('assets/textures/diffuse2.png'));
material.set('normalMap', loadTexture('assets/textures/normal.png'));

camera.position.set(0, 2, 4);
camera.lookAt(scene.position);

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
  const texture = new Texture2D();
  texture.load(src);
  return texture;
}

const config = {
  scale: 0.01
};
const gui = new dat.GUI();
gui.add(config, 'scale', 0, 0.1).onChange(function () {
  material.set('parallaxOcclusionScale', config.scale);
});
