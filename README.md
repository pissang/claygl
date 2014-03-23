#QTEK

Qtek is a graphic library for both canvas2d and webgl drawing. It is still an experiment version.

#####Features 

+ Scene graph based management of lights, meshes, cameras, materials and shaders
+ Basic primitive geometry procedural generate
    + Cube, sphere, cylinder, cone, plane
+ Phong and lambert buildin shaders which support normal map and environment map
+ Physically based shader
+ Point, directional, spot light
+ Orthographic, perspective camera
+ Graph based post processing
+ High quality shadow
    + PCF or VSM soft shadow
    + PSSM for sun light in large scene
    + Omni light shadow support
+ Geometory processing like normal and tangent generate
+ GPU based skinning
    + Support 1D and 2D animation blending with blend tree
+ First person camera control, orbit camera control
+ Skybox, skydom
+ Particle System
+ GPU Picking
+ Loader
	+ three.js model loader
	+ glTF loader

#####Animation
+ Timeline based animation, support spline interpolation between keyframes.

#####FBX2GLTF Converter

Have been updated to the latest glTF specification

+ Scene hierarchy
+ Mesh, light, camera
+ Material, texture
+ Skinning
+ Animation

#####Physics Component

[https://github.com/pissang/qtek-physics](https://github.com/pissang/qtek-physics)

#####2D Component

[https://github.com/pissang/qtek-2d](https://github.com/pissang/qtek-2d)

#####Feature Projects

[DOTA2 Hero Viewer](https://github.com/pissang/dota2hero)

<a href="http://efe.baidu.com/webgl/dota2hero/#/heroes" target="_blank">
<img src="http://pictures-shenyi.qiniudn.com/dota2hero-2.jpg" width="500px"></img>
</a>

[Bootcamp](https://github.com/pissang/qtek-bootcamp/)

<a href="http://efe.baidu.com/webgl/bootcamp/" target="_blank">
<img src="http://pictures-shenyi.qiniudn.com/bootcamp-1.jpg" width="500px"></img>
</a>

####Other Examples

[Sponza](http://pissang.github.io/qtek/sponza/)

+ Normal Mapping
+ Omnilight Shadow 

[Murcielago](http://pissang.github.io/qtek/murcielago)

+ [Simple material editor](http://pissang.github.io/qtek/murcielago/editor.html)
+ Image based lighting
+ Physically based shading
+ Realtime atmosphere scattering
+ Variance shadow map
+ HDR pipeline
    + Bloom
    + Eye adaption tone mapping
    + Linear space
+ FXAA