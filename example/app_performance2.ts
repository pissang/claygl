import { App3D, BasicShader, Mesh } from 'claygl';
import Stats from 'stats.js';
const stats = new Stats();
document.body.appendChild(stats.dom);

const app = new App3D('#main');

// Create camera
const camera = app.createCamera([0, 200, 600], [0, 0, 0]);

const cnt = 100;
const distance = 20;
const size = 10 / 2;
const material = app.createMaterial({
  color: 'red',
  shader: new BasicShader()
});
const cubes: Mesh[] = [];
for (let i = 0; i < cnt; ++i) {
  for (let j = 0; j < cnt; ++j) {
    const cube = app.createCube(material);
    cube.position.set((i - cnt / 2) * distance, (j - cnt / 2) * distance, 0);
    cube.scale.set(size, size, size);
    cubes.push(cube);
    cube.rotation.rotateX(Math.random() * 2).rotateY(Math.random() * 2);
  }
}

app.loop(function () {
  stats.end();
  stats.begin();
  cubes.forEach((cube) => {
    cube.rotation.rotateY(0.01);
  });
});
