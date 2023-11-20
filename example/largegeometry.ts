import {
  Shader,
  Renderer,
  Scene,
  SphereGeometry,
  Material,
  createWireframeShader,
  Mesh,
  startTimeline,
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
const sphere = new SphereGeometry({
  widthSegments: 400,
  heightSegments: 200
});
sphere.generateUniqueVertex();
sphere.generateBarycentric();

const material = new Material(createWireframeShader(), {
  transparent: true,
  depthTest: false
});
material.set('lineWidth', 2);

camera.position.set(0, 1, 2);
camera.lookAt(scene.position);

const sphereMesh = new Mesh(sphere, material);
scene.add(sphereMesh);

renderer.render(scene, camera);
startTimeline(() => {
  renderer.render(scene, camera);
  sphereMesh.rotation.rotateY(Math.PI / 500);
});
