define(function (require) {

    var CanvasRenderer = require('clay/canvas/Renderer');
    var CanvasMaterial = require('clay/canvas/Material');
    var SphereGeometry = require('clay/geometry/Sphere');
    var Scene = require('clay/Scene');
    var PerspectiveCamera = require('clay/camera/Perspective');
    var Mesh = require('clay/Mesh');
    var Timeline = require('clay/animation/Timeline');

    var renderer = new CanvasRenderer({
        canvas: document.getElementById('main'),
        devicePixelRatio: 1.0
    });
    renderer.resize(window.innerWidth, window.innerHeight);

    var scene = new Scene();
    var camera = new PerspectiveCamera({
        aspect: renderer.getViewportAspect()
    });

    camera.position.z = 4;

    var sphereGeo = new SphereGeometry({
        widthSegments: 10,
        heightSegments: 10
    });
    var attributes = sphereGeo.attributes;
    attributes.color.init(sphereGeo.vertexCount);
    for (var i = 0; i < sphereGeo.vertexCount; i++) {
        var uv = attributes.texcoord0.get(i, []);
        uv[2] = uv[3] = 1;
        attributes.color.set(i, uv);
    }

    var mesh = new Mesh({
        geometry: sphereGeo,
        material: new CanvasMaterial({
            pointSize: 5
        })
    });

    scene.add(mesh);

    var timeline =  new Timeline();
    timeline.start();

    timeline.on('frame', function (deltaTime) {
        renderer.render(scene, camera);

        stats.update();

        mesh.rotation.rotateY(0.001 * deltaTime);
    });

    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = 0;
    stats.domElement.style.right = 0;
    document.body.appendChild(stats.domElement);
});