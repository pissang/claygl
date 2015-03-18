define(function (require) {

    var Mesh = require('../Mesh');
    var PlaneGeometry = require('../geometry/Plane');
    var Material = require('../Material');
    var Shader = require('../Shader');
    var Matrix4 = require('../math/Matrix4');

    var spriteShader;

    /**
     * @constructor qtek.plugin.Sprite
     */
    var Sprite = Mesh.derive(function () {
        if (!spriteShader) {
            spriteShader = new Shader({
                vertex: Shader.source('buildin.basic.vertex'),
                fragment: Shader.source('buildin.basic.fragment')
            });
            spriteShader.enableTexture('diffuseMap');
        }
        var material = new Material({
            shader: spriteShader
        });

        return {
            /**
             * @type {qtek.Camera}
             * @memberOf qtek.plugin.Skybox.prototype
             */
            camera: null,

            geometry: new PlaneGeometry()
        }
    }, {
        update: function (forceUpdateWorld) {
            this.worldTransform.z = this.camera.worldTransform.z;
            this.worldTransform.y = this.camera.worldTransform.y;
            this.worldTransform.x = this.camera.worldTransform.x;

            this.decomposeWorldTransform();

            Mesh.prototype.update.call(this, forceUpdateWorld);
        }
    });
});