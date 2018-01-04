define(function (require) {

    var CanvasRenderer = require('clay/canvas/Renderer');
    var CanvasMaterial = require('clay/canvas/Material');
    var SphereGeometry = require('clay/geometry/Sphere');
    var Scene = require('clay/Scene');
    var PerspectiveCamera = require('clay/camera/Perspective');
    var Mesh = require('clay/Mesh');
    var Timeline = require('clay/animation/Timeline');
    var GLTFLoader = require('clay/loader/GLTF');
    var OrbitControl = require('clay/plugin/OrbitControl');

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

    var loader = new GLTFLoader();
    loader.load('../assets/models/suzanne/suzanne_low.gltf');
    loader.success(function (res) {

        var mesh = res.meshes['Suzanne-mesh'][0];
        var geometry = mesh.geometry;
        var attributes = geometry.attributes;
        attributes.color.init(geometry.vertexCount);
        for (var i = 0; i < geometry.vertexCount; i++) {
            var uv = attributes.normal.get(i, []);
            uv[3] = 1;
            attributes.color.set(i, uv);
        }

        mesh.rotation.rotateX(-Math.PI / 2);
        mesh.material = new CanvasMaterial();

        scene.add(mesh);
    });

    var timeline =  new Timeline();
    timeline.start();

    var control = new OrbitControl({
        domElement: renderer.canvas,
        target: camera
    });
    timeline.on('frame', function (deltaTime) {

        control.update();

        renderer.render(scene, camera);

        stats.update();
    });

    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = 0;
    stats.domElement.style.right = 0;
    document.body.appendChild(stats.domElement);
});