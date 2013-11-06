define( function(require){
	
	var exportsObject =  {
	"2d": {
		"Gradient": require('2d/Gradient'),
		"Layer": require('2d/Layer'),
		"LinearGradient": require('2d/LinearGradient'),
		"Node": require('2d/Node'),
		"Pattern": require('2d/Pattern'),
		"RadialGradient": require('2d/RadialGradient'),
		"Stage": require('2d/Stage'),
		"Style": require('2d/Style'),
		"picking": {
			"Box": require('2d/picking/Box'),
			"Pixel": require('2d/picking/Pixel')
		},
		"shape": {
			"Arc": require('2d/shape/Arc'),
			"Circle": require('2d/shape/Circle'),
			"Ellipse": require('2d/shape/Ellipse'),
			"HTML": require('2d/shape/HTML'),
			"Image": require('2d/shape/Image'),
			"Line": require('2d/shape/Line'),
			"Path": require('2d/shape/Path'),
			"Polygon": require('2d/shape/Polygon'),
			"Rectangle": require('2d/shape/Rectangle'),
			"RoundedRectangle": require('2d/shape/RoundedRectangle'),
			"SVGPath": require('2d/shape/SVGPath'),
			"Sector": require('2d/shape/Sector'),
			"Text": require('2d/shape/Text'),
			"TextBox": require('2d/shape/TextBox')
		},
		"util": require('2d/util')
	},
	"3d": {
		"BoundingBox": require('3d/BoundingBox'),
		"Camera": require('3d/Camera'),
		"FrameBuffer": require('3d/FrameBuffer'),
		"Geometry": require('3d/Geometry'),
		"Joint": require('3d/Joint'),
		"Light": require('3d/Light'),
		"Material": require('3d/Material'),
		"Mesh": require('3d/Mesh'),
		"Node": require('3d/Node'),
		"Renderer": require('3d/Renderer'),
		"Scene": require('3d/Scene'),
		"Shader": require('3d/Shader'),
		"Skeleton": require('3d/Skeleton'),
		"Texture": require('3d/Texture'),
		"WebGLInfo": require('3d/WebGLInfo'),
		"camera": {
			"Orthographic": require('3d/camera/Orthographic'),
			"Perspective": require('3d/camera/Perspective')
		},
		"compositor": {
			"Compositor": require('3d/compositor/Compositor'),
			"Graph": require('3d/compositor/Graph'),
			"Group": require('3d/compositor/Group'),
			"Node": require('3d/compositor/Node'),
			"Pass": require('3d/compositor/Pass'),
			"SceneNode": require('3d/compositor/SceneNode'),
			"TextureNode": require('3d/compositor/TextureNode'),
			"texturePool": require('3d/compositor/texturePool')
		},
		"debug": {
			"PointLight": require('3d/debug/PointLight')
		},
		"geometry": {
			"Cube": require('3d/geometry/Cube'),
			"Plane": require('3d/geometry/Plane'),
			"Sphere": require('3d/geometry/Sphere')
		},
		"glenum": require('3d/glenum'),
		"light": {
			"Ambient": require('3d/light/Ambient'),
			"Directional": require('3d/light/Directional'),
			"Point": require('3d/light/Point'),
			"Spot": require('3d/light/Spot')
		},
		"particleSystem": {
			"Emitter": require('3d/particleSystem/Emitter'),
			"ForceField": require('3d/particleSystem/ForceField'),
			"GravityField": require('3d/particleSystem/GravityField'),
			"Particle": require('3d/particleSystem/Particle'),
			"ParticleSystem": require('3d/particleSystem/ParticleSystem')
		},
		"plugin": {
			"FirstPersonControl": require('3d/plugin/FirstPersonControl'),
			"OrbitControl": require('3d/plugin/OrbitControl'),
			"Skybox": require('3d/plugin/Skybox'),
			"Skydome": require('3d/plugin/Skydome')
		},
		"prePass": {
			"Reflection": require('3d/prePass/Reflection'),
			"ShadowMap": require('3d/prePass/ShadowMap')
		},
		"shader": {
			"library": require('3d/shader/library')
		},
		"texture": {
			"Texture2D": require('3d/texture/Texture2D'),
			"TextureCube": require('3d/texture/TextureCube')
		},
		"util": {
			"mesh": require('3d/util/mesh')
		}
	},
	"animation": {
		"Animation": require('animation/Animation'),
		"Clip": require('animation/Clip'),
		"easing": require('animation/easing')
	},
	"core": {
		"Base": require('core/Base'),
		"Cache": require('core/Cache'),
		"Event": require('core/Event'),
		"Matrix2": require('core/Matrix2'),
		"Matrix2d": require('core/Matrix2d'),
		"Matrix3": require('core/Matrix3'),
		"Matrix4": require('core/Matrix4'),
		"Quaternion": require('core/Quaternion'),
		"Value": require('core/Value'),
		"Vector2": require('core/Vector2'),
		"Vector3": require('core/Vector3'),
		"Vector4": require('core/Vector4'),
		"mixin": {
			"derive": require('core/mixin/derive'),
			"notifier": require('core/mixin/notifier')
		},
		"request": require('core/request')
	},
	"loader": {
		"FX": require('loader/FX'),
		"GLTF": require('loader/GLTF'),
		"InstantGeometry": require('loader/InstantGeometry'),
		"SVG": require('loader/SVG'),
		"three": {
			"Model": require('loader/three/Model')
		}
	},
	"util": {
		"color": require('util/color'),
		"util": require('util/util')
	}
};

    var glMatrix = require('glmatrix');
    exportsObject.math = glMatrix;
    
    return exportsObject;
})