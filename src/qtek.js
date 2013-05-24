define( function(require){
	
	var exportsObject =  {
	"2d": {
		"Camera": require('2d/camera'),
		"Node": require('2d/node'),
		"renderable": {
			"Arc": require('2d/renderable/arc'),
			"Circle": require('2d/renderable/circle'),
			"Image": require('2d/renderable/image'),
			"Line": require('2d/renderable/line'),
			"Path": require('2d/renderable/path'),
			"Polygon": require('2d/renderable/polygon'),
			"Rectangle": require('2d/renderable/rectangle'),
			"RoundedRectangle": require('2d/renderable/roundedrectangle'),
			"Sector": require('2d/renderable/sector'),
			"Text": require('2d/renderable/text'),
			"TextBox": require('2d/renderable/textbox')
		},
		"Renderer": require('2d/renderer'),
		"Scene": require('2d/scene'),
		"Style": require('2d/style'),
		"util": require('2d/util')
	},
	"3d": {
		"Camera": require('3d/camera'),
		"camera": {
			"Orthographic": require('3d/camera/orthographic'),
			"Perspective": require('3d/camera/perspective')
		},
		"Compositor": require('3d/compositor'),
		"compositor": {
			"graph": {
				"Graph": require('3d/compositor/graph/graph'),
				"Node": require('3d/compositor/graph/node'),
				"SceneNode": require('3d/compositor/graph/scenenode'),
				"Texturepool": require('3d/compositor/graph/texturepool')
			},
			"Pass": require('3d/compositor/pass')
		},
		"debug": {
			"Pointlight": require('3d/debug/pointlight'),
			"RenderInfo": require('3d/debug/renderinfo')
		},
		"FrameBuffer": require('3d/framebuffer'),
		"Geometry": require('3d/geometry'),
		"geometry": {
			"Cube": require('3d/geometry/cube'),
			"Plane": require('3d/geometry/plane'),
			"Sphere": require('3d/geometry/sphere')
		},
		"Light": require('3d/light'),
		"light": {
			"Ambient": require('3d/light/ambient'),
			"Directional": require('3d/light/directional'),
			"Point": require('3d/light/point'),
			"Spot": require('3d/light/spot')
		},
		"Material": require('3d/material'),
		"Mesh": require('3d/mesh'),
		"Node": require('3d/node'),
		"plugin": {
			"FirstPersonControl": require('3d/plugin/firstpersoncontrol')
		},
		"prepass": {
			"ShadowMap": require('3d/prepass/shadowmap')
		},
		"Renderer": require('3d/renderer'),
		"Scene": require('3d/scene'),
		"Shader": require('3d/shader'),
		"shader": {
			"library": require('3d/shader/library')
		},
		"Texture": require('3d/texture'),
		"texture": {
			"Texture2D": require('3d/texture/texture2d'),
			"TextureCube": require('3d/texture/texturecube')
		},
		"util": {
			"mesh": require('3d/util/mesh')
		}
	},
	"core": {
		"Base": require('core/base'),
		"Cache": require('core/cache'),
		"Event": require('core/event'),
		"Matrix3": require('core/matrix3'),
		"Matrix4": require('core/matrix4'),
		"mixin": {
			"derive": require('core/mixin/derive'),
			"Dirty": require('core/mixin/dirty'),
			"notifier": require('core/mixin/notifier')
		},
		"Quaternion": require('core/quaternion'),
		"requester": require('core/request'),
		"Vector2": require('core/vector2'),
		"Vector3": require('core/vector3'),
		"Vector4": require('core/vector4')
	},
	"loader": {
		"three": {
			"JSON": require('loader/three/json')
		}
	},
	"Text": require('text'),
	"util": {
		"Color": require('util/color'),
		"Util": require('util/util'),
		"Xmlparser": require('util/xmlparser')
	}
};

    var glMatrix = require('glmatrix');
    exportsObject.math = glMatrix;
    
    return exportsObject;
})