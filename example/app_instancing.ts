import { InstancedMesh, App3D, CubeGeometry, Node as ClayNode, BoundingBox, Vector3 } from 'claygl';

const app = new App3D('#main', {
  graphic: {
    shadow: true
  }
});
// Create camera
const camera = app.createCamera([0, 2, 5], [0, 0, 0]);

// Create cube
const cubeIntancedMesh = new InstancedMesh(
  new CubeGeometry(),
  app.createMaterial({
    color: 'red'
  }),
  {
    frustumCulling: false,
    instances: []
  }
);

const mesh = cubeIntancedMesh;

app.scene.add(cubeIntancedMesh);

var CUBE_COUNT = 50;
for (var i = 0; i < CUBE_COUNT; i++) {
  for (var j = 0; j < CUBE_COUNT; j++) {
    var node = new ClayNode();
    node.position.x = i - CUBE_COUNT / 2;
    node.position.z = j - CUBE_COUNT / 2;
    node.scale.set(0.4, 0.4, 0.4);

    node.rotation.rotateX(Math.random());

    cubeIntancedMesh.instances.push({
      node: node
    });
    app.scene.add(node);
  }
}

cubeIntancedMesh.boundingBox = new BoundingBox(new Vector3(-25, -1, -25), new Vector3(25, 1, 25));

// Create light
const mainLight = app.createDirectionalLight([-2, -1, -1]);
mainLight.shadowResolution = 2048;

app.loop(() => {
  mesh.instances.forEach(function (instance) {
    instance.node.rotation.rotateX(0.01);
  });
});

window.onresize = function () {
  app.resize();
};
