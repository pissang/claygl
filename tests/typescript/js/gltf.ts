///<reference path="../../../typescript/qtek.d.ts" />
var renderer: qtek.Renderer = new qtek.Renderer();
var camera: qtek.camera.Perspective= new qtek.camera.Perspective();

renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

camera.aspect = renderer.width / renderer.height;
camera.position.set(2, 2, 2);
camera.lookAt(qtek.math.Vector3.ZERO);

var control: qtek.plugin.OrbitControl = new qtek.plugin.OrbitControl();
control.domElement = renderer.canvas;
control.target = camera;
control.enable();

var shadowMapPass: qtek.prePass.ShadowMap = new qtek.prePass.ShadowMap();
shadowMapPass.softShadow = qtek.prePass.ShadowMap.VSM;

var glTFLLoader: qtek.loader.GLTF = new qtek.loader.GLTF();
glTFLLoader.load('../assets/scenes/gltf/scene.json');

glTFLLoader.success(function(result) {
    var scene: qtek.Scene = result.scene;
    scene.rotation.rotateX(-Math.PI / 2);

    var light: qtek.light.Spot = <qtek.light.Spot> scene.getNode("Spot");
    light.range = 50;
    light.umbraAngle = 10;
    light.penumbraAngle = 25;
    light.shadowResolution = 512;

    var animation: qtek.animation.Animation = new qtek.animation.Animation();
    animation.start();
    animation.on('frame', function(deltaTime: number) {
        control.update(deltaTime);
        shadowMapPass.render(renderer, scene, camera);
        renderer.render(scene, camera);
        shadowMapPass.renderDebug(renderer);
    });
});

