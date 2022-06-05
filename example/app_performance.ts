import { App3D, OrbitControl, Vector3, createUnlitShader, Mesh } from 'claygl';
const app = new App3D('#main', {
  graphic: {
    shadow: true
  }
});

// Create camera
const camera = app.createCamera([0, 150, 200], [0, 100, 0]);

const { pointLight1, pointLight2 } = initLights();

// Create a room.
const wallCube = app.createCubeInside({
  roughness: 1,
  color: [0.3, 0.3, 0.3]
});
// Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
wallCube.castShadow = false;
wallCube.scale.set(400, 200, 400);
wallCube.position.y = 200;

const { cubes } = initCubes();

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container
});

// Load model. return a load promise to make sure the look will be start after model loaded.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf').then(function (result) {
  result.materials.forEach(function (mat) {
    mat.set('roughness', 1);
  });
});

function initLights() {
  // Create lights
  app.createAmbientLight('#fff', 0.2);

  const pointLight1 = app.createPointLight([100, 300, 100], 800, '#22f', 2);
  const pointLight2 = app.createPointLight([-160, 250, 200], 800, '#2f2', 2);
  pointLight1.castShadow = true;
  pointLight2.castShadow = true;

  app.createSphere(
    {
      shader: createUnlitShader(),
      color: [0.3, 0.3, 1]
    },
    pointLight1
  );

  app.createSphere(
    {
      shader: createUnlitShader(),
      color: [0.3, 1, 0.3]
    },
    pointLight2
  );

  return { pointLight1, pointLight2 };
}

function initCubes() {
  const cubes: {
    mesh: Mesh;
    center: Vector3;
    moveSpeed: number;
    rotateSpeed: number;
  }[] = [];
  function randPos() {
    const r = Math.random() * 200 + 100;
    const alpha = Math.PI * 2 * Math.random();
    const beta = (Math.PI / 6) * Math.random() + Math.PI / 2.5;
    return [
      Math.cos(alpha) * Math.sin(beta) * r,
      Math.cos(beta) * r + 100,
      Math.sin(alpha) * Math.sin(beta) * r
    ];
  }
  for (var i = 0; i < 1000; i++) {
    const cubeMesh = app.createCube({
      color: [Math.random(), Math.random(), Math.random()]
    });
    cubeMesh.position.setArray(randPos());
    cubes.push({
      mesh: cubeMesh,
      center: new Vector3(0, cubeMesh.position.y, 0),
      moveSpeed: Math.random(),
      rotateSpeed: Math.random() * 5
    });
  }

  return { cubes };
}

app.loop((frameTime) => {
  control.update(app.frameTime);
  pointLight1.rotateAround(new Vector3(0, 100, 0), new Vector3(0.1, 1, 0.1), 0.1);
  pointLight2.rotateAround(new Vector3(0, 120, 0), new Vector3(-0.1, 1, -0.2), 0.05);

  const frameTimeSecond = frameTime / 1000;
  cubes.forEach(function (cube) {
    cube.mesh.rotateAround(cube.center, Vector3.UP, cube.moveSpeed * frameTimeSecond);
    cube.mesh.rotation
      .rotateX(cube.rotateSpeed * frameTimeSecond)
      .rotateY(cube.rotateSpeed * frameTimeSecond);
  });
});

window.onresize = function () {
  app.resize();
};
