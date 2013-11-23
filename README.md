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
+ Phong and lambert buildin shaders which support normal map and environment map
+ Point, directional, spot light
+ Orthographic, perspective camera
+ Graph based post processing
+ Shadow Mapping with PCF or VSM soft shadows, omnilight shadow.
+ Geometory processing like normal and tangent generate
+ GPU based skinning
+ First person camera control, orbit camera control
+ Skybox, skydom
+ Particle System
+ GPU Picking
+ Loader
	+ three.js model loader
	+ glTF loader
+ FBX to glTF converter

#####Unified multiple layer

#####Animation
+ Timeline based animation, support spline interpolation between keyframes.

###Examples


#####WebGL

[Sponza](http://pissang.github.io/qtek/sponza/)

+ Normal Mapping
+ Omnilight Shadow 

[Minicooper](http://pissang.github.io/qtek/minicooper/)

+ Environment Map

[DOTA2 Hero Viewer](http://pissang.github.io/qtek/dota2hero/)

+ GPU Skinning
+ Custom complex shader
+ [Full version](https://github.com/pissang/dota2hero)

[Murcielago](http://pissang.github.io/qtek/murcielago)

+ Image based lighting
+ Physically based shading
+ Realtime atmosphere scattering
+ VSM