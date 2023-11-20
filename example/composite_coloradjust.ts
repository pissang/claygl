import {
  Renderer,
  Scene,
  Material,
  createLambertShader,
  Shader,
  FilterCompositeNode,
  SceneCompositeNode,
  Compositor,
  CubeGeometry,
  Texture2D,
  Mesh,
  Vector3,
  DirectionalLight,
  startTimeline,
  Camera
} from 'claygl';
import { colorAdjustCompositeFragment } from '../src/shader/source/compositor/coloradjust.glsl';

const compositor = new Compositor();

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
//Create scene
const scene = new Scene();
const camera = new Camera('perspective', {
  aspect: renderer.canvas.width / renderer.canvas.height,
  far: 500
});
const cube = new CubeGeometry();
const shader = createLambertShader();
const material = new Material(shader);
const texture = new Texture2D();
texture.load('assets/textures/crate.gif');
material.set('diffuseMap', texture);
const mesh = new Mesh(cube, material);

scene.add(mesh);

camera.position.set(0, 2, 5);
camera.lookAt(new Vector3());

var light = new DirectionalLight({
  color: [1.5, 1.5, 1.5]
});
light.position.set(50, 50, 50);
light.lookAt(new Vector3());
scene.add(light);

const sceneCompositeNode = new SceneCompositeNode(scene, camera);
compositor.addNode(sceneCompositeNode);

const colorAdjustNode = new FilterCompositeNode(colorAdjustCompositeFragment);
colorAdjustNode.inputs = {
  colorTex: sceneCompositeNode
};
colorAdjustNode.renderToScreen = true;
colorAdjustNode.material.set('gamma', 1.2);
compositor.addNode(colorAdjustNode);

startTimeline(() => {
  mesh.rotation.rotateY(Math.PI / 500);
  compositor.render(renderer);
});
