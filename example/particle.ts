import {
  Renderer,
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  Material,
  Texture2D,
  Mesh,
  LambertShader,
  Vector3,
  ParticleRenderable,
  ParticleEmitter,
  startTimeline,
  PointLight
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('Main') as HTMLCanvasElement
});

renderer.resize(window.innerWidth, window.innerHeight);

const particleRenderable = new ParticleRenderable();
const emitter = new ParticleEmitter({
  max: 5000,
  amount: 7,
  life: ParticleEmitter.constant(2),
  spriteSize: ParticleEmitter.constant(400),
  position: ParticleEmitter.random3D(new Vector3(-100, -30, 50), new Vector3(100, -40, 90)),
  velocity: ParticleEmitter.random3D(new Vector3(-20, 0, -10), new Vector3(20, 20, 10))
});
particleRenderable.addEmitter(emitter);
particleRenderable.material.set('color', [1, 1, 1]);
particleRenderable.material.set(
  'sprite',
  new Texture2D({
    image: generateSprite()
  })
);

const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 1000,
  near: 1
});
camera.position.set(0, 0, 120);
scene.add(particleRenderable);

const planeMesh = new Mesh({
  geometry: new PlaneGeometry(),
  material: new Material({
    shader: new LambertShader()
  })
});
planeMesh.material.set('color', [0.3, 0, 0]);
planeMesh.scale.set(10000, 10000, 1);
scene.add(planeMesh);

const light = new PointLight({
  range: 300
});
light.position.z = 50;
light.position.y = -40;
scene.add(light);
startTimeline((deltaTime) => {
  particleRenderable.updateParticles(deltaTime);
  renderer.render(scene, camera);
});

function generateSprite() {
  const size = 128;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 60, 0, Math.PI * 2, false);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,239,179,1)');
  gradient.addColorStop(0.34, 'rgba(255,212,157,1)');
  gradient.addColorStop(0.7, 'rgba(130,55,55,0.51)');
  gradient.addColorStop(1.0, 'rgba(130,55,55,0.0)');
  ctx.fillStyle = gradient;
  ctx.fill();

  return canvas;
}
