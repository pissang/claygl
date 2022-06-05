import { Scene, Node as ClayNode, Mesh, CubeGeometry, Material, createUnlitShader } from 'claygl';

const scene = new Scene();

const cube = new CubeGeometry();
const material = new Material(createUnlitShader());
const root = new ClayNode();
scene.add(root);
for (let i = 0; i < 10; i++) {
  const subRoot = new ClayNode();
  root.add(subRoot);
  for (let j = 0; j < 10; j++) {
    const subRoot2 = new ClayNode();
    subRoot.add(subRoot2);
    for (let k = 0; k < 100; k++) {
      const mesh = new Mesh(cube, material);
      mesh.position.set(20 - Math.random() * 40, 20 - Math.random() * 40, 20 - Math.random() * 40);
      subRoot2.add(mesh);
    }
  }
}
setInterval(function () {
  const start = performance.now();
  scene.update();
  const end = performance.now();
  const time = end - start;
  document.getElementById('time')!.innerHTML = time + '';
}, 1000);
