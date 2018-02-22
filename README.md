<h1><img src="./asset/logo.svg" style="height:30px">  ClayGL</h1>

<img width="100%" src="./screenshot/claygl-logo.jpg" />

<!-- [![NPM Version](https://img.shields.io/npm/v/claygl.svg)](https://github.com/pissang/claygl) -->

[![Circle CI](https://circleci.com/gh/pissang/claygl.svg?style=shield)](https://circleci.com/gh/pissang/claygl)

ClayGL is a WebGL graphic library for building scalable Web3D applications.

It's easy to use, configurable for high-quality graphics. Benefit from the modularity and tree shaking, it can be scaled down to 40k(gzipped) for a basic 3D application.

#### [Download](https://github.com/pissang/claygl/releases)

#### [API](http://docs.claygl.xyz/api)

#### [Examples](http://examples.claygl.xyz)

## Projects

[ECharts GL](https://github.com/ecomfe/echarts-gl)

<a href="https://github.com/ecomfe/echarts-gl" target="_blank">
<img src="./screenshot/echarts-gl.jpg" width="500" />
</a>

[Clay Viewer](https://github.com/pissang/clay-viewer)

<a href="https://github.com/pissang/clay-viewer" target="_blank">
<img src="./screenshot/clay-viewer.jpg" width="500" />
</a>


[DOTA2 Hero Viewer](https://github.com/pissang/dota2hero)

<a href="https://github.com/pissang/dota2hero" target="_blank">
<img src="./screenshot/dota2hero.jpg" width="500" />
</a>

[Worldcup 2014 Intro Movie](https://github.com/pissang/worldcup-intro)

<a href="https://github.com/pissang/worldcup-intro" target="_blank">
<img src="https://github.com/pissang/worldcup-intro/raw/master/screenshots/2.png" width="500" alt="">
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
    clay.application.create('#main', {

      width: window.innerWidth,
      height: window.innerHeight,

      init: function (renderer, scene, timeline) {
        // Create camera
        this._camera = app.createCamera([0, 2, 5], [0, 0, 0]);

        // Create a RED cube
        this._cube = app.createCube({
            color: '#f00'
        });

        // Create light
        this._mainLight = app.createDirectionalLight([-1, -1, -1]);
      },

      loop: function (renderer, scene, timeline) {
        this._cube.rotation.rotateY(this.frameTime / 1000);
      }
    });
  </script>
</body>
</html>
```

## Current Features

+ Scene graph based management of lights, meshes, cameras, materials and shaders
+ Basic primitive geometry procedural generate
  + Cube, sphere, cylinder, cone, plane
+ Phong and lambert buildin shaders which support normal map and environment map
+ Point, directional, spot light
+ Orthographic, perspective camera
+ Graph based post processing
+ High quality shadow
  + PCF or VSM soft shadow
  + PSSM for sun light in large scene
  + Omni light shadow support
+ High performance geometry processing
+ GPU based skinning
  + Support 1D and 2D animation blending with blend tree
+ First person camera control, orbit camera control
+ Skybox, skydom
+ Particle System
+ Support both ray picking and GPU Picking
+ Loader
  + glTF loader
+ Timeline based animation, support spline interpolation between keyframes.
+ Full deferred pipeline.
+ Physically based rendering, Full HDR pipeline.
+ Stereo rendering, VR ready.


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

+ FBX
+ COLLADA
+ OBJ

Output:

+ Scene hierarchy
+ Mesh and camera
+ PBR material
+ Texture
+ Skin
+ Animation


