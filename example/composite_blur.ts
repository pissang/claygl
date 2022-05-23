import {
  Renderer,
  Scene,
  PerspectiveCamera,
  Material,
  createLambertShader,
  SceneCompositeNode,
  Compositor,
  CubeGeometry,
  Texture2D,
  Mesh,
  Vector3,
  DirectionalLight,
  startTimeline
} from 'claygl';
import GaussianBlurCompositeNode from './common/HDComposite/GaussianBlurNode';

const compositor = new Compositor();

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
//Create scene
const scene = new Scene();
const camera = new PerspectiveCamera({
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
sceneCompositeNode.outputs = {
  color: {}
};

const blurNode = new GaussianBlurCompositeNode();
blurNode.inputs = {
  texture: sceneCompositeNode
};
compositor.addNode(sceneCompositeNode, blurNode);

startTimeline(() => {
  mesh.rotation.rotateY(Math.PI / 500);
  compositor.render(renderer);
});
