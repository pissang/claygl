/**
 * @export{class} SceneNode
 */
define( function( require ){

    var Node = require("./node");
    var Pass = require("../pass");
    var FrameBuffer = require("../../framebuffer");
    var texturePool = require("./texturepool");

    var frameBuffer = new FrameBuffer();

    var SceneNode = Node.derive( function(){
        return {
            scene : null,
            camera : null,
            material : null
        }
    }, {
        render : function( renderer, texture ){

            if( ! this.outputs){
                renderer.render( this.scene, this.camera );
            }else{
                for( var name in this.outputs){
                    var outputInfo = this.outputs[name];
                    var texture = texturePool.get( outputInfo.parameters );
                    this._textures[name] = texture;

                    var attachment = outputInfo.attachment || 'COLOR_ATTACHMENT0';

                    frameBuffer.attach( renderer.gl, texture, attachment);
                }
                frameBuffer.bind( renderer );

                if( this.material ){
                    this.scene.material = this.material;
                }
                renderer.render( this.scene, this.camera );
                this.scene.material = null;

                frameBuffer.unbind( renderer );
            }
        }
    })

    return SceneNode;
} )