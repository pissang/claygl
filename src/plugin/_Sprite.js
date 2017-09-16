import Mesh from '../Mesh';
import PlaneGeometry from '../geometry/Plane';
import Material from '../Material';
import Shader from '../Shader';
import Matrix4 from '../math/Matrix4';

var spriteShader;

/**
 * @constructor qtek.plugin.Sprite
 */
var Sprite = Mesh.extend(function () {
    if (!spriteShader) {
        spriteShader = new Shader({
            vertex: Shader.source('qtek.basic.vertex'),
            fragment: Shader.source('qtek.basic.fragment')
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

export default Sprite;
