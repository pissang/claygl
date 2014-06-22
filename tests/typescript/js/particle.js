///<reference path="../../../typescript/qtek.d.ts" />
var renderer = new qtek.Renderer();
var camera = new qtek.camera.Perspective();
var scene = new qtek.Scene();
var animation = new qtek.animation.Animation();
animation.start();
renderer.resize(window.innerWidth, window.innerHeight);
camera.aspect = renderer.width / renderer.height;
camera.position.z = 120;

document.body.appendChild(renderer.canvas);

var particleRenderable = new qtek.particleSystem.ParticleRenderable();
var emitter = new qtek.particleSystem.Emitter({
    max: 5000,
    amount: 7,
    life: qtek.math.Value.constant(2),
    spriteSize: qtek.math.Value.constant(400),
    position: qtek.math.Value.random3D(new qtek.math.Vector3(-100, -30, 50), new qtek.math.Vector3(100, -40, 90)),
    velocity: qtek.math.Value.random3D(new qtek.math.Vector3(-20, 0, -10), new qtek.math.Vector3(20, 20, 10))
});
particleRenderable.addEmitter(emitter);
particleRenderable.material.set('color', [1, 1, 1]);
particleRenderable.material.shader.enableTexture("sprite");
particleRenderable.material.set('sprite', new qtek.texture.Texture2D({
    image: generateSprite(128)
}));

scene.add(particleRenderable);

var planeMesh = new qtek.Mesh({
    geometry: new qtek.geometry.Plane(),
    material: new qtek.Material({
        shader: new qtek.Shader({
            vertex: qtek.Shader.source("buildin.lambert.vertex"),
            fragment: qtek.Shader.source("buildin.lambert.fragment")
        })
    })
});
planeMesh.material.set('color', [0.3, 0, 0]);
planeMesh.scale.set(10000, 10000, 1);
scene.add(planeMesh);

var light = new qtek.light.Point({
    range: 300
});
light.position.set(0, -40, 50);
scene.add(light);

animation.on('frame', function (deltaTime) {
    particleRenderable.updateParticles(deltaTime);
    renderer.render(scene, camera);
});

function generateSprite(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    var ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 60, 0, Math.PI * 2, false);
    ctx.closePath();

    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,239,179,1)');
    gradient.addColorStop(0.34, 'rgba(255,212,157,1)');
    gradient.addColorStop(0.7, 'rgba(130,55,55,0.51)');
    gradient.addColorStop(1.0, 'rgba(130,55,55,0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    return canvas;
}
