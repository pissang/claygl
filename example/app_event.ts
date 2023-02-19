import { App3D, vec3 } from 'claygl';
const app = new App3D('#main', {
  event: true
});

// Create camera
const camera = app.createCamera([0, 2, 5], [0, 0, 0]);

// Create cube
const cube = app.createCube();

['pointerover', 'pointermove', 'pointerout', 'click', 'dbclick'].forEach(function (eveType) {
  // TODO Event type
  cube.on(eveType, function (event: any) {
    console.log('Event: ' + event.type);
  });
}, this);

function makeRandomColor() {
  return vec3.fromValues(Math.random(), Math.random(), Math.random());
}

var randomColor = makeRandomColor();

cube
  .on('mouseover', function () {
    cube.material.set('color', randomColor);
    randomColor = makeRandomColor();
  })
  .on('mouseout', function () {
    cube.material.set('color', randomColor);
    randomColor = makeRandomColor();
  });

// Create light
const mainLight = app.createDirectionalLight([-1, -1, -1]);

app.loop((frameTime) => {
  cube.rotation.rotateY(frameTime / 1000);
});

window.onresize = function () {
  app.resize();
};
