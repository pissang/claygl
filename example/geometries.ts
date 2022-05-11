import {
  Renderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  Material,
  WireframeShader,
  SphereGeometry,
  CubeGeometry,
  PlaneGeometry,
  ConeGeometry,
  CylinderGeometry,
  ParametricSurfaceGeometry,
  OrbitControl,
  startTimeline
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const sphere = new SphereGeometry({
  widthSegments: 20,
  heightSegments: 20
});
const cube = new CubeGeometry({
  widthSegments: 10,
  heightSegments: 10,
  depthSegments: 10
});
const plane = new PlaneGeometry({
  widthSegments: 10,
  heightSegments: 10
});
const cone = new ConeGeometry({
  heightSegments: 10
});
const cylinder = new CylinderGeometry({
  heightSegments: 10
});
const parametricSurfae = new ParametricSurfaceGeometry({
  generator: {
    u: [-Math.PI, Math.PI, Math.PI / 20],
    v: [-15, 6, 0.21],
    x: function (u, v) {
      return Math.pow(1.16, v) * Math.cos(v) * (1 + Math.cos(u));
    },
    y: function (u, v) {
      return -2 * Math.pow(1.16, v) * (1 + Math.sin(u));
    },
    z: function (u, v) {
      return -Math.pow(1.16, v) * Math.sin(v) * (1 + Math.cos(u));
    }
  }
});
sphere.generateBarycentric();
cube.generateBarycentric();
plane.generateBarycentric();
cone.generateBarycentric();
cylinder.generateBarycentric();
parametricSurfae.generateBarycentric();

const material = new Material({
  shader: new WireframeShader(),
  transparent: true,
  depthTest: false
});
material.set('lineWidth', 2);

camera.position.set(0, 0, 9);

const sphereMesh = new Mesh({
  geometry: sphere,
  material: material,
  culling: false
});
const cubeMesh = new Mesh({
  geometry: cube,
  material: material,
  culling: false
});
const planeMesh = new Mesh({
  geometry: plane,
  material: material,
  culling: false
});
const coneMesh = new Mesh({
  geometry: cone,
  material: material,
  culling: false
});
const cylinderMesh = new Mesh({
  geometry: cylinder,
  material: material,
  culling: false
});
const parametricSurfaceMesh = new Mesh({
  geometry: parametricSurfae,
  material: material,
  culling: false
});
sphereMesh.position.x = -3;
cubeMesh.position.x = -1.5;
cubeMesh.scale.set(0.7, 0.7, 0.7);
coneMesh.position.x = 1.5;
cylinderMesh.position.x = 3;
parametricSurfaceMesh.position.x = 5;
parametricSurfaceMesh.scale.set(0.2, 0.2, 0.2);

scene.add(sphereMesh);
scene.add(planeMesh);
scene.add(cubeMesh);
scene.add(coneMesh);
scene.add(cylinderMesh);
scene.add(parametricSurfaceMesh);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});
startTimeline((dTime) => {
  renderer.render(scene, camera);
  control.update(dTime);
  cubeMesh.rotation.rotateY((Math.PI * dTime) / 5000);
  planeMesh.rotation.rotateY((Math.PI * dTime) / 5000);
  sphereMesh.rotation.rotateY((Math.PI * dTime) / 5000);
  coneMesh.rotation.rotateY((Math.PI * dTime) / 5000);
  cylinderMesh.rotation.rotateY((Math.PI * dTime) / 5000);
  parametricSurfaceMesh.rotation.rotateY((Math.PI * dTime) / 5000);
});
