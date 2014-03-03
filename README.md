#QTEK

Qtek is a graphic library for both canvas2d and webgl drawing. It is still an experiment version.

#####Canvas 2D
+ Scene graph based management of all shapes
+ Common shapes drawing, rectangle, arc, circle, ellipse, line, path(paper.js), path(svg), polygon, roundedr rectangle, sector, text, textbox, image
+ Bounding box calculate for curves
+ Per pixel picking
+ SVG parser

#####WebGL 

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

#####Feature Projects

[DOTA2 Hero Viewer](https://github.com/pissang/dota2hero)

<a href="http://efe.baidu.com/webgl/dota2hero/#/heroes" target="_blank">
<img src="http://d.pcs.baidu.com/thumbnail/3a0aedddb41715fc387b7f92491200ec?fid=2215764494-250528-649074891821195&time=1393829350&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-S2JeeOmjrDbrAA%2BsCgKLXpzbiZw%3D&expires=8h&prisign=RK9dhfZlTqV5TuwkO5ihMSi9urWA6/WDVOZJjW161c97pPFvBnDjJvo8Gcuo6pQpogOJnfqRidH27k9J0e2dzkmye5j3Whl2AAcnn80Hb97vFxQMiFwgORaeYyj8G4F48GIoCsFhKea/WLh/GJ5KldnT0FmIWjcIaLoOA1zPVLTxisYh+duuFB32F+3CHRP8VcUWDxuyGTBer3i6fMyABlH+b80j2kE0Vb67k+tHpLD3ZFiFsVu6BA==&r=396634700&size=c850_u580&quality=100" width="500px"></img>
</a>

[Bootcamp](https://github.com/pissang/qtek-bootcamp/)

<a href="http://efe.baidu.com/webgl/bootcamp/" target="_blank">
<img src="http://d.pcs.baidu.com/thumbnail/56c0ffd61c895290381c95c2cafba5cf?fid=2215764494-250528-1110279864986968&time=1393829018&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-98KtcMi4zLXtmvU6%2BqqTITLj4Vg%3D&expires=8h&prisign=RK9dhfZlTqV5TuwkO5ihMSi9urWA6/WDVOZJjW161c97pPFvBnDjJvo8Gcuo6pQpogOJnfqRidH27k9J0e2dzkmye5j3Whl2AAcnn80Hb97vFxQMiFwgORaeYyj8G4F48GIoCsFhKea/WLh/GJ5KldnT0FmIWjcIaLoOA1zPVLTxisYh+duuFB32F+3CHRP8VcUWDxuyGTBer3i6fMyABlH+b80j2kE0Vb67k+tHpLDWmYV+mZa0eA==&r=354985134&size=c850_u580&quality=100" width="500px"></img>
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