define( function(require){
	
	var exportsObject =  {
	"Camera": require('qtek/Camera'),
	"DynamicGeometry": require('qtek/DynamicGeometry'),
	"FrameBuffer": require('qtek/FrameBuffer'),
	"Geometry": require('qtek/Geometry'),
	"Joint": require('qtek/Joint'),
	"Layer": require('qtek/Layer'),
	"Light": require('qtek/Light'),
	"Material": require('qtek/Material'),
	"Mesh": require('qtek/Mesh'),
	"Node": require('qtek/Node'),
	"Renderer": require('qtek/Renderer'),
	"Scene": require('qtek/Scene'),
	"Shader": require('qtek/Shader'),
	"Skeleton": require('qtek/Skeleton'),
	"Stage": require('qtek/Stage'),
	"StaticGeometry": require('qtek/StaticGeometry'),
	"Texture": require('qtek/Texture'),
	"animation": {
		"Animation": require('qtek/animation/Animation'),
		"Blend1DClip": require('qtek/animation/Blend1DClip'),
		"Blend2DClip": require('qtek/animation/Blend2DClip'),
		"Clip": require('qtek/animation/Clip'),
		"SamplerClip": require('qtek/animation/SamplerClip'),
		"SkinningClip": require('qtek/animation/SkinningClip'),
		"TransformClip": require('qtek/animation/TransformClip'),
		"easing": require('qtek/animation/easing')
	},
	"async": {
		"Task": require('qtek/async/Task'),
		"TaskGroup": require('qtek/async/TaskGroup')
	},
	"camera": {
		"Orthographic": require('qtek/camera/Orthographic'),
		"Perspective": require('qtek/camera/Perspective')
	},
	"compositor": {
		"Compositor": require('qtek/compositor/Compositor'),
		"Graph": require('qtek/compositor/Graph'),
		"Group": require('qtek/compositor/Group'),
		"Node": require('qtek/compositor/Node'),
		"Pass": require('qtek/compositor/Pass'),
		"SceneNode": require('qtek/compositor/SceneNode'),
		"TextureNode": require('qtek/compositor/TextureNode'),
		"texturePool": require('qtek/compositor/texturePool')
	},
	"core": {
		"Base": require('qtek/core/Base'),
		"Cache": require('qtek/core/Cache'),
		"Event": require('qtek/core/Event'),
		"glenum": require('qtek/core/glenum'),
		"glinfo": require('qtek/core/glinfo'),
		"mixin": {
			"derive": require('qtek/core/mixin/derive'),
			"notifier": require('qtek/core/mixin/notifier')
		},
		"request": require('qtek/core/request'),
		"util": require('qtek/core/util')
	},
	"geometry": {
		"Capsule": require('qtek/geometry/Capsule'),
		"Cone": require('qtek/geometry/Cone'),
		"Cube": require('qtek/geometry/Cube'),
		"Cylinder": require('qtek/geometry/Cylinder'),
		"Plane": require('qtek/geometry/Plane'),
		"Sphere": require('qtek/geometry/Sphere')
	},
	"light": {
		"Ambient": require('qtek/light/Ambient'),
		"Directional": require('qtek/light/Directional'),
		"Point": require('qtek/light/Point'),
		"Spot": require('qtek/light/Spot')
	},
	"loader": {
		"FX": require('qtek/loader/FX'),
		"GLTF": require('qtek/loader/GLTF'),
		"three": {
			"Model": require('qtek/loader/three/Model')
		}
	},
	"math": {
		"BoundingBox": require('qtek/math/BoundingBox'),
		"Frustum": require('qtek/math/Frustum'),
		"Matrix2": require('qtek/math/Matrix2'),
		"Matrix2d": require('qtek/math/Matrix2d'),
		"Matrix3": require('qtek/math/Matrix3'),
		"Matrix4": require('qtek/math/Matrix4'),
		"Plane": require('qtek/math/Plane'),
		"Quaternion": require('qtek/math/Quaternion'),
		"Ray": require('qtek/math/Ray'),
		"Value": require('qtek/math/Value'),
		"Vector2": require('qtek/math/Vector2'),
		"Vector3": require('qtek/math/Vector3'),
		"Vector4": require('qtek/math/Vector4')
	},
	"particleSystem": {
		"Emitter": require('qtek/particleSystem/Emitter'),
		"ForceField": require('qtek/particleSystem/ForceField'),
		"GravityField": require('qtek/particleSystem/GravityField'),
		"Particle": require('qtek/particleSystem/Particle'),
		"ParticleSystem": require('qtek/particleSystem/ParticleSystem')
	},
	"picking": {
		"Pixel": require('qtek/picking/Pixel')
	},
	"plugin": {
		"FirstPersonControl": require('qtek/plugin/FirstPersonControl'),
		"InfinitePlane": require('qtek/plugin/InfinitePlane'),
		"OrbitControl": require('qtek/plugin/OrbitControl'),
		"Skybox": require('qtek/plugin/Skybox'),
		"Skydome": require('qtek/plugin/Skydome')
	},
	"prePass": {
		"EnvironmentMap": require('qtek/prePass/EnvironmentMap'),
		"Reflection": require('qtek/prePass/Reflection'),
		"ShadowMap": require('qtek/prePass/ShadowMap')
	},
	"shader": {
		"library": require('qtek/shader/library')
	},
	"texture": {
		"Texture2D": require('qtek/texture/Texture2D'),
		"TextureCube": require('qtek/texture/TextureCube')
	},
	"util": {
		"dds": require('qtek/util/dds'),
		"delaunay": require('qtek/util/delaunay'),
		"hdr": require('qtek/util/hdr'),
		"mesh": require('qtek/util/mesh'),
		"texture": require('qtek/util/texture')
	}
};

    var glMatrix = require('glmatrix');
    exportsObject.glMatrix = glMatrix;
    
    return exportsObject;
})