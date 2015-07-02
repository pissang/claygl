///<reference path="../../../typescript/qtek.d.ts" />
var renderer: qtek.Renderer = new qtek.Renderer();
var camera: qtek.camera.Perspective = new qtek.camera.Perspective();
var scene: qtek.Scene = new qtek.Scene();
var compositor: qtek.compositor.Compositor = new qtek.compositor.Compositor();

renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);
camera.aspect = renderer.getViewportAspect();
camera.position.z = 5;

var cubeMat: qtek.Material = new qtek.Material({
    shader: new qtek.Shader({
        vertex: qtek.Shader.source("buildin.lambert.vertex"),
        fragment: qtek.Shader.source("buildin.lambert.fragment")
    })
});
cubeMat.shader.enableTexture("diffuseMap");

var diffuseTexture: qtek.texture.Texture2D = new qtek.texture.Texture2D();
diffuseTexture.load('../assets/textures/crate.gif');

cubeMat.set('diffuseMap', diffuseTexture);

var cubeMesh = new qtek.Mesh({
    material: cubeMat,
    geometry: new qtek.geometry.Cube()
});

scene.add(cubeMesh);

var light: qtek.light.Directional = new qtek.light.Directional({
    color: [1.5, 1.5, 1.5]
});
light.position.set(50, 50, 50);
light.lookAt(qtek.math.Vector3.ZERO);
scene.add(light);

var sceneNode = new qtek.compositor.SceneNode({
    name: "scene",
    scene: scene,
    camera: camera,
    outputs: {
        color: {
            parameters: {
                width: function(renderer) {return renderer.width},
                height: function(renderer) {return renderer.height}
            }
        }
    }
});
var gaussianNodeH = new qtek.compositor.Node({
    name: "gaussian1",
    shader: qtek.Shader.source("buildin.compositor.gaussian_blur_h"),
    inputs: {
        texture: {
            node: "scene",
            pin: "color"
        }
    },
    outputs: {
        color: {
            parameters: {
                width: function(renderer) {return renderer.width},
                height: function(renderer) {return renderer.height}
            }
        }
    }
});
var gaussianNodeV = new qtek.compositor.Node({
    name: "gaussian2",
    shader: qtek.Shader.source("buildin.compositor.gaussian_blur_v"),
    inputs: {
        texture: {
            node: "gaussian1",
            pin: "color"
        }
    }
});

gaussianNodeH.setParameter("textureWidth", renderer.getWidth());
gaussianNodeV.setParameter("textureHeight", renderer.getHeight());
compositor.addNode(gaussianNodeH);
compositor.addNode(gaussianNodeV);
compositor.addNode(sceneNode);

var animation: qtek.animation.Animation = new qtek.animation.Animation();
animation.start();

animation.on('frame', function(deltaTime) {
    cubeMesh.rotation.rotateY(0.01);
    compositor.render(renderer);
});
