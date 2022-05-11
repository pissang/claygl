import {
  Renderer,
  DeferredRenderer,
  SphereGeometry,
  Skeleton,
  Scene,
  Material,
  Geometry,
  BasicShader,
  Mesh,
  loadGLTF,
  PerspectiveCamera,
  Vector3,
  OrbitControl,
  DirectionalLight,
  AmbientLight,
  PlaneGeometry,
  StandardMaterial,
  startTimeline
} from 'claygl';

function createSkeletonDebugScene(skeleton: Skeleton) {
  const scene = new Scene();
  const sphereGeo = new SphereGeometry({
    radius: 0.1
  });
  const sphereMat = new Material({
    shader: new BasicShader()
  });
  sphereMat.set('color', [0.3, 0.3, 0.3]);

  const updates: (() => void)[] = [];
  skeleton.joints.forEach(function (joint) {
    const sphere = new Mesh({
      geometry: sphereGeo,
      material: sphereMat,
      autoUpdateLocalTransform: false
    });
    scene.add(sphere);

    const lineGeo = new Geometry();
    const lineGeoVertices = lineGeo.attributes.position;
    lineGeoVertices.fromArray([0, 0, 0, 0, 0, 0]);
    const line = new Mesh({
      geometry: lineGeo,
      material: sphereMat,
      mode: Mesh.LINES,
      lineWidth: 2
    });
    scene.add(line);

    updates.push(function () {
      const node = joint.node!;
      const parentNode = node.getParent();
      sphere.localTransform.copy(node.worldTransform);
      if (parentNode) {
        lineGeoVertices.set(0, node.getWorldPosition().array);
        lineGeoVertices.set(1, parentNode.getWorldPosition().array);
      }
      lineGeo.dirty();
    });
  });

  scene.before('render', function () {
    for (let i = 0; i < updates.length; i++) {
      updates[i]();
    }
  });
  return scene;
}

const renderer = new Renderer({
  canvas: document.getElementById('Main') as HTMLCanvasElement
});
const deferredRenderer = new DeferredRenderer();

renderer.resize(window.innerWidth, window.innerHeight);

loadGLTF('assets/models/whale/whale-anim.gltf').then((res) => {
  const scene = res.scene!;
  const skeleton = res.skeletons[0];
  const animator = res.animators[0];
  const camera = new PerspectiveCamera({
    aspect: renderer.getViewportAspect()
  });

  camera.position.set(0, 10, 30);
  camera.lookAt(new Vector3(0, 2, 0));

  camera.aspect = renderer.canvas.width / renderer.canvas.height;

  const control = new OrbitControl({
    target: camera,
    domElement: renderer.canvas,
    panSensitivity: 0.4,
    zoomSensitivity: 0.4
  });

  const light = new DirectionalLight({
    intensity: 1
  });
  light.position.set(1, 1, 1);
  light.lookAt(scene.position);
  scene.add(light);

  const plane = new Mesh({
    geometry: new PlaneGeometry(),
    material: new StandardMaterial()
  });
  plane.rotation.rotateX(-Math.PI / 2);
  plane.scale.set(20, 20, 1);
  scene.add(plane);

  scene.add(
    new AmbientLight({
      intensity: 0.2
    })
  );

  const skeletonDebugScene = createSkeletonDebugScene(skeleton);
  skeletonDebugScene.position.x = -10;
  const timeline = startTimeline(() => {
    control.update(50);
    skeleton.update();
    deferredRenderer.render(renderer, scene, camera);
  });

  timeline.addAnimator(animator);
});
