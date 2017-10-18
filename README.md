# QTEK

QTEK is a WebGL graphic library.

### [Download v0.3.0](https://github.com/pissang/qtek/archive/0.3.0.zip)

### [API](http://pissang.github.io/qtek/doc/api)

### [Playground](https://github.com/pissang/qtek-playground)

### Feature Projects

[DOTA2 Hero Viewer](https://github.com/pissang/dota2hero)

<a href="https://github.com/pissang/qtek-bootcamp" target="_blank">
<img src="http://pictures-shenyi.qiniudn.com/dota2hero-2.jpg" width="500"></img>
</a>

[Bootcamp](https://github.com/pissang/qtek-bootcamp/)

<a href="https://github.com/pissang/qtek-bootcamp/" target="_blank">
<img src="http://pictures-shenyi.qiniudn.com/bootcamp-1.jpg" width="500"></img>
</a>

[Worldcup 2014 Intro Movie](https://github.com/pissang/worldcup-intro)

<a href="https://github.com/pissang/worldcup-intro" target="_blank">
<img src="https://github.com/pissang/worldcup-intro/raw/master/screenshots/2.png" width="500" alt="">
</a>


### Quick Examples
+ [Ten thousand cubes with normal mapping](http://pissang.github.io/qtek/tests/cubes.html)
+ [Cube animation](http://pissang.github.io/qtek/tests/cubeanim.html)
+ [A simple glTF scene](http://pissang.github.io/qtek/tests/gltf.html)
+ [Skinning](http://pissang.github.io/qtek/tests/skinning.html)
+ [Particle effects](http://pissang.github.io/qtek/tests/particle.html)
+ [Shadowmap](http://pissang.github.io/qtek/tests/shadowmap.html)
+ [Omni light shadow mapping](http://pissang.github.io/qtek/tests/cubeshadowmap.html)
+ [RGBE Decoder](http://pissang.github.io/qtek/tests/rgbedecoder.html)
+ [Skybox](http://pissang.github.io/qtek/tests/skybox.html)
+ [Draggable cubes](http://pissang.github.io/qtek/tests/picking.html)
+ [Ambient Cubemap](http://pissang.github.io/qtek/tests/ambientcubemap.html)
+ [Spherical Harmonic Ambient](http://pissang.github.io/qtek/tests/spherical_harmonic.html)
+ [Physically based rendering with HDR IBL](http://pissang.github.io/qtek/tests/IBL.html)
+ [Standard Material](http://pissang.github.io/qtek/tests/standard_material.html)
+ [Post processing - Depth of field](http://pissang.github.io/qtek/tests/dof.html)
+ [Post processing - Bloom](http://pissang.github.io/qtek/tests/tron.html)
+ [Post Processing - SSR](http://pissang.github.io/qtek/tests/ssr3.html)
+ [Post Processing - Alchemy AO](http://pissang.github.io/qtek/tests/alchemyao.html)
+ [GBuffer preview](http://pissang.github.io/qtek/tests/gbuffer.html)
+ [Deferred rendering](http://pissang.github.io/qtek/tests/deferred.html)
+ [Deferred cascade light shadow](http://pissang.github.io/qtek/tests/deferred_shadow3.html)
+ [Deferred omni light light shadow](http://pissang.github.io/qtek/tests/deferred_shadow.html)
+ [Deferred skinning](http://pissang.github.io/qtek/tests/deferred_skinning.html)
+ [Stereo rendering](http://pissang.github.io/qtek/tests/stereo.html)

### Features

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
+ Stereo rendering, VR prepared.


### FBX to glTF2.0 Converter

[Get it](https://github.com/pissang/qtek/blob/master/tools/fbx2gltf2.py)

Needs [python3.3](https://www.python.org/download/releases/3.3.0/) and [FBX SDK 2018.1.1](http://usa.autodesk.com/adsk/servlet/pc/item?siteID=123112&id=26416130)

```
usage: fbx2gltf2.py [-h] [-e EXCLUDE] [-t TIMERANGE] [-o OUTPUT]
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
  -p POSE, --pose POSE  Static pose time
  -q, --quantize        Quantize accessors with WEB3D_quantized_attributes
                        extension
  -b, --beautify        Beautify json output.
```

Support:

+ Scene hierarchy
+ Mesh, camera
+ Blinn material
+ Texture
+ Skinning
+ Animation


