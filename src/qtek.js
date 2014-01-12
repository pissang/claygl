define( function(require){
	
	var exportsObject =  {
	"2d": {
		"Camera": require('2d/Camera'),
		"CanvasRenderer": require('2d/CanvasRenderer'),
		"Gradient": require('2d/Gradient'),
		"LinearGradient": require('2d/LinearGradient'),
		"Node": require('2d/Node'),
		"Pattern": require('2d/Pattern'),
		"RadialGradient": require('2d/RadialGradient'),
		"Scene": require('2d/Scene'),
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
	"Camera": require('Camera'),
	"DynamicGeometry": require('DynamicGeometry'),
	"FrameBuffer": require('FrameBuffer'),
	"Geometry": require('Geometry'),
	"Joint": require('Joint'),
	"Layer": require('Layer'),
	"Light": require('Light'),
	"Material": require('Material'),
	"Mesh": require('Mesh'),
	"Node": require('Node'),
	"Renderer": require('Renderer'),
	"Scene": require('Scene'),
	"Shader": require('Shader'),
	"Skeleton": require('Skeleton'),
	"Stage": require('Stage'),
	"StaticGeometry": require('StaticGeometry'),
	"Texture": require('Texture'),
	"animation": {
		"Animation": require('animation/Animation'),
		"Blend1DClip": require('animation/Blend1DClip'),
		"Blend2DClip": require('animation/Blend2DClip'),
		"Clip": require('animation/Clip'),
		"SamplerClip": require('animation/SamplerClip'),
		"SkinningClip": require('animation/SkinningClip'),
		"TransformClip": require('animation/TransformClip'),
		"easing": require('animation/easing')
	},
	"camera": {
		"Orthographic": require('camera/Orthographic'),
		"Perspective": require('camera/Perspective')
	},
	"compositor": {
		"Compositor": require('compositor/Compositor'),
		"Graph": require('compositor/Graph'),
		"Group": require('compositor/Group'),
		"Node": require('compositor/Node'),
		"Pass": require('compositor/Pass'),
		"SceneNode": require('compositor/SceneNode'),
		"TextureNode": require('compositor/TextureNode'),
		"texturePool": require('compositor/texturePool')
	},
	"core": {
		"Async": require('core/Async'),
		"Base": require('core/Base'),
		"Cache": require('core/Cache'),
		"Event": require('core/Event'),
		"color": require('core/color'),
		"glenum": require('core/glenum'),
		"glinfo": require('core/glinfo'),
		"mixin": {
			"derive": require('core/mixin/derive'),
			"notifier": require('core/mixin/notifier')
		},
		"request": require('core/request'),
		"util": require('core/util')
	},
	"geometry": {
		"Cube": require('geometry/Cube'),
		"Plane": require('geometry/Plane'),
		"Sphere": require('geometry/Sphere')
	},
	"light": {
		"Ambient": require('light/Ambient'),
		"Directional": require('light/Directional'),
		"Point": require('light/Point'),
		"Spot": require('light/Spot')
	},
	"loader": {
		"FX": require('loader/FX'),
		"GLTF": require('loader/GLTF'),
		"SVG": require('loader/SVG'),
		"three": {
			"Model": require('loader/three/Model')
		}
	},
	"math": {
		"BoundingBox": require('math/BoundingBox'),
		"Frustum": require('math/Frustum'),
		"Matrix2": require('math/Matrix2'),
		"Matrix2d": require('math/Matrix2d'),
		"Matrix3": require('math/Matrix3'),
		"Matrix4": require('math/Matrix4'),
		"Plane": require('math/Plane'),
		"Quaternion": require('math/Quaternion'),
		"Ray": require('math/Ray'),
		"Value": require('math/Value'),
		"Vector2": require('math/Vector2'),
		"Vector3": require('math/Vector3'),
		"Vector4": require('math/Vector4')
	},
	"particleSystem": {
		"Emitter": require('particleSystem/Emitter'),
		"ForceField": require('particleSystem/ForceField'),
		"GravityField": require('particleSystem/GravityField'),
		"Particle": require('particleSystem/Particle'),
		"ParticleSystem": require('particleSystem/ParticleSystem')
	},
	"picking": {
		"Pixel": require('picking/Pixel')
	},
	"plugin": {
		"FirstPersonControl": require('plugin/FirstPersonControl'),
		"OrbitControl": require('plugin/OrbitControl'),
		"Skybox": require('plugin/Skybox'),
		"Skydome": require('plugin/Skydome')
	},
	"prePass": {
		"EnvironmentMap": require('prePass/EnvironmentMap'),
		"Reflection": require('prePass/Reflection'),
		"ShadowMap": require('prePass/ShadowMap')
	},
	"shader": {
		"library": require('shader/library')
	},
	"texture": {
		"Texture2D": require('texture/Texture2D'),
		"TextureCube": require('texture/TextureCube')
	},
	"util": {
		"dds": require('util/dds'),
		"hdr": require('util/hdr'),
		"mesh": require('util/mesh'),
		"texture": require('util/texture')
	}
};

    var glMatrix = require('glmatrix');
    exportsObject.glMatrix = glMatrix;
    
    return exportsObject;
})