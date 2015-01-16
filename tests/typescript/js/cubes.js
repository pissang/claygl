///<reference path="../../../typescript/qtek.d.ts" />
var renderer = new qtek.Renderer();
var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective();
var animation = new qtek.animation.Animation();
animation.start();

renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

camera.aspect = renderer.width / renderer.height;

var rootNode = new qtek.Node();
var cubeGeo = new qtek.geometry.Cube();
var cubeMat = new qtek.Material({
    shader: qtek.shader.library.get('buildin.basic', "diffuseMap")
});
var diffuseTexture = new qtek.Texture2D();
diffuseTexture.load('../assets/textures/crate.gif');
cubeMat.setUniform("diffuseMap", diffuseTexture);

for (var i = 0; i < 10; i++) {
    for (var j = 0; j < 10; j++) {
        for (var k = 0; k < 10; k++) {
            var mesh = new qtek.Mesh({
                material: cubeMat,
                geometry: cubeGeo
            });
            mesh.scale.set(0.5, 0.5, 0.5);
            mesh.position.set(10 - Math.random() * 20, 10 - Math.random() * 20, 10 - Math.random() * 20);
            rootNode.add(mesh);
        }
    }
}
scene.add(rootNode);

animation.on('frame', function (deltaTime) {
    renderer.render(scene, camera);
    rootNode.rotation.rotateY(0.01);
});
