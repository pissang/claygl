///<reference path="../../../typescript/qtek.d.ts" />
var renderer: qtek.Renderer = new qtek.Renderer();
var scene: qtek.Scene = new qtek.Scene();
var camera: qtek.camera.Perspective = new qtek.camera.Perspective();
var animation: qtek.animation.Animation = new qtek.animation.Animation();
animation.start();

renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.canvas);

camera.aspect = renderer.getViewportAspect();

var rootNode: qtek.Node = new qtek.Node();
var cubeGeo: qtek.geometry.Cube = new qtek.geometry.Cube();
var cubeMat: qtek.Material = new qtek.Material({
   shader: qtek.shader.library.get('buildin.basic', "diffuseMap")
});
var diffuseTexture: qtek.texture.Texture2D = new qtek.texture.Texture2D();
diffuseTexture.load('../assets/textures/crate.gif');
cubeMat.setUniform("diffuseMap", diffuseTexture);

for(var i:number = 0; i < 10; i++) {
    for(var j: number = 0; j < 10; j++) {
        for(var k: number = 0; k < 10; k++) {
            var mesh: qtek.Mesh = new qtek.Mesh({
                material: cubeMat,
                geometry: cubeGeo
            });
            mesh.scale.set(0.5, 0.5, 0.5);
            mesh.position.set(10-Math.random()*20, 10-Math.random()*20, 10-Math.random() * 20);
            rootNode.add(mesh);
        }
    }
}
scene.add(rootNode);

animation.on('frame', function(deltaTime) {
    renderer.render(scene, camera);
    rootNode.rotation.rotateY(0.01);
});