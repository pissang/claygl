define(function (require) {

    var CanvasRenderer = require('qtek/canvas/Renderer');
    var CanvasMaterial = require('qtek/canvas/Material');
    var SphereGeometry = require('qtek/geometry/Sphere');
    var Scene = require('qtek/Scene');
    var PerspectiveCamera = require('qtek/camera/Perspective');
    var Mesh = require('qtek/Mesh');
    var Animation = require('qtek/animation/Animation');
    var GLTFLoader = require('qtek/loader/GLTF');
    var OrbitControl = require('qtek/plugin/OrbitControl');

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
    loader.load('../assets/models/suzanne_low.json');
    loader.success(function (res) {

        var mesh = res.meshes['Suzanne-mesh'][0];
        var geometry = mesh.geometry;
        var attributes = geometry.attributes;
        attributes.color.init(geometry.getVertexNumber());
        for (var i = 0; i < geometry.getVertexNumber(); i++) {
            var uv = attributes.normal.get(i, []);
            uv[3] = 1;
            attributes.color.set(i, uv);
        }
    
        mesh.rotation.rotateX(-Math.PI / 2);
        mesh.material = new CanvasMaterial();

        scene.add(mesh);
    });

    var animation = new Animation();
    animation.start();

    var control = new OrbitControl({
        domElement: renderer.canvas,
        target: camera
    });
    animation.on('frame', function (deltaTime) {

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