import {
  Renderer,
  PerspectiveCamera,
  OrthographicCamera,
  Material,
  CubeGeometry,
  PlaneGeometry,
  Texture2D,
  Mesh,
  FrameBuffer,
  Vector3,
  PointLight,
  Scene,
  createStandardShader,
  createUnlitShader,
  startTimeline
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
//Create scene
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});
const cube = new CubeGeometry();
const material = new Material(createStandardShader());
const texture = new Texture2D();
texture.load('assets/textures/crate.gif');
material.set('diffuseMap', texture);
const mesh = new Mesh(cube, material);

scene.add(mesh);

camera.position.set(0, 1.5, 3);
camera.lookAt(new Vector3(0, 0, 0));

const light = new PointLight({
  color: [1.5, 1.5, 1.5]
});
light.position.set(0, 0, 3);
scene.add(light);

const frameBuffer = new FrameBuffer();
const rtt = new Texture2D({
  width: 1024,
  height: 1024
});
frameBuffer.attach(rtt);
const rttShader = createUnlitShader();
const rttMesh = new Mesh(new PlaneGeometry(), new Material(rttShader));
rttMesh.material.set('diffuseMap', rtt);
const rttScene = new Scene();
rttScene.add(rttMesh);

const orthCamera = new OrthographicCamera();

startTimeline(() => {
  renderer.render(scene, camera, frameBuffer);
  renderer.render(rttScene, orthCamera);

  mesh.rotation.rotateY(Math.PI / 500);
});
