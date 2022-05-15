import { App3D, InstancedMesh, Node as ClayNode } from 'claygl';
const app = new App3D('#main', {
  graphic: {
    shadow: true,
    tonemapping: true
  }
});
// Create camera
const camera = app.createCamera([100, 300, 800], [0, 100, 0]);
camera.far = 10000;

// Load boombox model.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf').then(function (result) {
  const instancedMeshes = result.meshes.map((mesh) => {
    return new InstancedMesh(mesh.geometry, mesh.material, {
      skeleton: mesh.skeleton,
      joints: mesh.joints,
      frustumCulling: false,
      instances: []
    });
  });

  result.meshes.forEach((mesh, idx) => {
    const parent = mesh.getParent()!;
    parent.remove(mesh);
    parent.add(instancedMeshes[idx]);
  });

  const ROBOT_COUNT = 8;
  const instances: InstancedMesh['instances'] = [];
  for (var i = 0; i < ROBOT_COUNT; i++) {
    for (var j = 0; j < ROBOT_COUNT; j++) {
      var node = new ClayNode();
      node.position.x = (i - ROBOT_COUNT / 2) * 150;
      node.position.z = (j - ROBOT_COUNT / 2) * 150;

      instances.push({
        node: node
      });
      app.scene.add(node);
    }
  }

  instancedMeshes.forEach((mesh) => {
    mesh.instances = instances;
  });
});

const plane = app.createPlane();
plane.rotation.rotateX(-Math.PI / 2);
plane.scale.set(1000, 1000, 1);
plane.castShadow = false;

// Create light
const mainLight = app.createDirectionalLight([-2, -1, -1]);
mainLight.intensity = 1;
mainLight.shadowResolution = 2048;

window.onresize = function () {
  app.resize();
};
