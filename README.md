<h1><img src="./asset/logo.svg" style="height:30px">  ClayGL</h1>

<img width="100%" src="./asset/claygl-logo.jpg" />

[![NPM Version](https://img.shields.io/npm/v/claygl.svg)](https://github.com/pissang/claygl)
[![Circle CI](https://circleci.com/gh/pissang/claygl.svg?style=shield)](https://circleci.com/gh/pissang/claygl)

ClayGL is a WebGL graphic library for building scalable Web3D applications.

It's easy to use, configurable for high-quality graphics. Benefit from the modularity and tree shaking, it can be scaled down to 22k(gzipped) for a basic 3D application.

#### [Download](https://github.com/pissang/claygl/releases)

#### [API](http://docs.claygl.xyz/api)

#### [Examples](http://examples.claygl.xyz)

## Projects

[ECharts GL](https://github.com/ecomfe/echarts-gl)

<a href="https://github.com/ecomfe/echarts-gl" target="_blank">
<img src="./asset/echarts-gl.jpg" width="500" />
</a>

[Clay Viewer](https://github.com/pissang/clay-viewer)

<a href="https://github.com/pissang/clay-viewer" target="_blank">
<img src="./asset/clay-viewer.jpg" width="500" />
</a>

[DOTA2 Hero Viewer](https://github.com/pissang/dota2hero)

<a href="https://github.com/pissang/dota2hero" target="_blank">
<img src="./asset/dota2hero.jpg" width="500" />
</a>

[Paper Cut Art Generator](https://github.com/pissang/papercut-box-art)

<a href="https://github.com/pissang/papercut-box-art" target="_blank">
<img src="https://github.com/pissang/papercut-box-art/blob/master/screenshots/3.jpg" width="500" alt="">
</a>

[Little Big City](https://github.com/pissang/little-big-city)

<a href="https://github.com/pissang/little-big-city" target="_blank">
<img src="https://github.com/pissang/little-big-city/blob/gh-pages/asset/screenshot.png" width="500" alt="">
</a>

## Quick Start

##### Create a rotating cube

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="lib/claygl.js"></script>
  </head>
  <body>
    <canvas id="main"></canvas>
    <script>
      const app = new clay.App3D('#main', {
        width: window.innerWidth,
        height: window.innerHeight
      });
      // Create camera
      const camera = app.createCamera([0, 2, 5], [0, 0, 0]);

      // Create a RED cube
      const cube = app.createCube({
        color: '#f00'
      });

      // Create light
      const mainLight = app.createDirectionalLight([-1, -1, -1]);

      app.loop((frameTime) => {
        cube.rotation.rotateY(frameTime / 1000);
      });
    </script>
  </body>
</html>
```

#### Minimum bundle example

This example is about 22k(gzipped) after bundled by webpack 4.0. It draws a triangle on the screen.

```js
import { Renderer, GeometryBase, Shader, Material } from 'claygl';

const vsCode = `
attribute vec3 position: POSITION;
void main() {
    gl_Position = vec4(position, 1.0);
}
`;
const fsCode = `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
}
`;

const renderer = new Renderer({
  canvas: document.getElementById('main')
});
renderer.resize(400, 400);

const geometry = new GeometryBase();
const positionAttrib = geometry.createAttribute('position', 'float', 3);
// Add triangle vertices to position attribute.
positionAttrib.fromArray([
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
]);

const material = new Material({
  shader: new Shader(vsCode, fsCode)
});
renderer.renderPass([{ geometry, material }]);
```

### FBX to glTF2.0 Converter

[Get it](https://github.com/pissang/claygl/blob/master/tools/fbx2gltf.py)

Needs [python3.3](https://www.python.org/download/releases/3.3.0/) and [FBX SDK 2018.1.1](http://usa.autodesk.com/adsk/servlet/pc/item?siteID=123112&id=26416130).

```
usage: fbx2gltf.py [-h] [-e EXCLUDE] [-t TIMERANGE] [-o OUTPUT]
          [-f FRAMERATE] [-p POSE] [-q] [-b]
          file

FBX to glTF converter

positional arguments:
  file

optional arguments:
  -h, --help            show this help message and exit
  -e EXCLUDE, --exclude EXCLUDE
            Data excluded. Can be: scene,animation
  -t TIMERANGE, --timerange TIMERANGE
            Export animation time, in format
            'startSecond,endSecond'
  -o OUTPUT, --output OUTPUT
            Ouput glTF file path
  -f FRAMERATE, --framerate FRAMERATE
            Animation frame per second
  -p POSE, --pose POSE  Start pose time
  -q, --quantize        Quantize accessors with WEB3D_quantized_attributes
            extension
  -b, --binary          Export glTF-binary
  --beautify            Beautify json output.
  --noflipv             If not flip v in texcoord.
```

Input:

- FBX
- COLLADA
- OBJ

Output:

- Scene hierarchy
- Mesh and camera
- PBR material
- Texture
- Skin
- Animation
