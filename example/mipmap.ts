import {
  startTimeline,
  Shader,
  Renderer,
  Scene,
  PerspectiveCamera,
  Material,
  Texture2D,
  constants,
  createStandardShader,
  createUnlitShader,
  TextureCube,
  SphereGeometry,
  PlaneGeometry,
  Mesh,
  Vector3,
  Node as ClayNode,
  TextureCubeSource
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);

const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const material = new Material(createUnlitShader());
const texture = new Texture2D({
  wrapS: constants.REPEAT,
  wrapT: constants.REPEAT,
  mipmaps: [
    createMipMap(32, '#000'),
    createMipMap(16, '#222'),
    createMipMap(8, '#555'),
    createMipMap(4, '#999'),
    createMipMap(2, '#aaa'),
    createMipMap(1, '#fff')
  ]
});
const textureCube = new TextureCube({
  wrapS: constants.REPEAT,
  wrapT: constants.REPEAT,
  mipmaps: [
    createMipMapCube(128, '#02a'),
    createMipMapCube(64, '#000'),
    createMipMapCube(32, '#000'),
    createMipMapCube(16, '#f00'),
    createMipMapCube(8, '#f0f'),
    createMipMapCube(4, '#00f'),
    createMipMapCube(2, '#0f0'),
    createMipMapCube(1, '#f00')
  ]
});

material.set('diffuseMap', texture);
material.set('uvRepeat', [100, 100]);

function createMipMap(size: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  return {
    data: new Uint8Array(imgData),
    width: size,
    height: size
  };
}

function createMipMapCube(size: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  return (['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const).reduce((obj, target) => {
    obj[target] = {
      data: new Uint8Array(imgData),
      width: size,
      height: size
    };
    return obj;
  }, {} as TextureCubeSource);
}

const root = new ClayNode();

camera.position.set(0, 4, 14);
camera.lookAt(new Vector3(0, 1, 0));

scene.add(root);
// Add Plane
const plane = new PlaneGeometry({
  widthSegments: 1,
  heightSegments: 1
});
const planeMesh = new Mesh(plane, material, {
  scale: new Vector3(60, 60, 60)
});
planeMesh.position.y = -0.8;
planeMesh.rotation.rotateX(-Math.PI / 2);
root.add(planeMesh);

const sphereGeo = new SphereGeometry();
const envMapMaterial = new Material(createStandardShader());
envMapMaterial.set('environmentMap', textureCube);
for (let i = 0; i < 10; i++) {
  const sphere = new Mesh(sphereGeo, envMapMaterial);
  sphere.scale.set(5, 5, 5);
  sphere.position.set(-10, 5, -i * 10);
  root.add(sphere);
}

startTimeline(() => {
  renderer.render(scene, camera);
});
