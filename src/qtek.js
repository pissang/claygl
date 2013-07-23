define( function(require){
	
	var exportsObject =  {
	"2d": {
		"Camera": require('2d/camera'),
		"Gradient": require('2d/gradient'),
		"Layer": require('2d/layer'),
		"LinearGradient": require('2d/lineargradient'),
		"Node": require('2d/node'),
		"Pattern": require('2d/pattern'),
		"RadialGradient": require('2d/radialgradient'),
		"shape": {
			"Arc": require('2d/shape/arc'),
			"Circle": require('2d/shape/circle'),
			"Ellipse": require('2d/shape/ellipse'),
			"HTML": require('2d/shape/html'),
			"Image": require('2d/shape/image'),
			"Line": require('2d/shape/line'),
			"Path": require('2d/shape/path'),
			"Polygon": require('2d/shape/polygon'),
			"Rectangle": require('2d/shape/rectangle'),
			"RoundedRectangle": require('2d/shape/roundedrectangle'),
			"Sector": require('2d/shape/sector'),
			"SVGPath": require('2d/shape/svgpath'),
			"Text": require('2d/shape/text'),
			"TextBox": require('2d/shape/textbox')
		},
		"Stage": require('2d/stage'),
		"Style": require('2d/style'),
		"util": require('2d/util')
	},
	"3d": {
		"Bone": require('3d/bone'),
		"Camera": require('3d/camera'),
		"camera": {
			"Orthographic": require('3d/camera/orthographic'),
			"Perspective": require('3d/camera/perspective')
		},
		"Compositor": require('3d/compositor'),
		"compositor": {
			"Graph": require('3d/compositor/graph'),
			"Group": require('3d/compositor/group'),
			"Node": require('3d/compositor/node'),
			"Pass": require('3d/compositor/pass'),
			"SceneNode": require('3d/compositor/scenenode'),
			"TextureNode": require('3d/compositor/texturenode'),
			"TexturePool": require('3d/compositor/texturepool')
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
			"FirstPersonControl": require('3d/plugin/firstpersoncontrol'),
			"OrbitControl": require('3d/plugin/orbitcontrol')
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
		"Skeleton": require('3d/skeleton'),
		"Texture": require('3d/texture'),
		"texture": {
			"Compressed2d": require('3d/texture/compressed2d'),
			"Compressedcube": require('3d/texture/compressedcube'),
			"Texture2D": require('3d/texture/texture2d'),
			"TextureCube": require('3d/texture/texturecube')
		},
		"util": {
			"mesh": require('3d/util/mesh')
		},
		"WebGLInfo": require('3d/webglinfo')
	},
	"animation": {
		"Animation": require('animation/animation'),
		"Controller": require('animation/controller'),
		"Easing": require('animation/easing')
	},
	"core": {
		"Base": require('core/base'),
		"Cache": require('core/cache'),
		"Event": require('core/event'),
		"Matrix2": require('core/matrix2'),
		"Matrix2d": require('core/matrix2d'),
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
		"SVG": require('loader/svg'),
		"three": {
			"Model": require('loader/three/model'),
			"Scene": require('loader/three/scene')
		}
	},
	"util": {
		"Color": require('util/color'),
		"Util": require('util/util')
	}
};

    var glMatrix = require('glmatrix');
    exportsObject.math = glMatrix;
    
    return exportsObject;
})