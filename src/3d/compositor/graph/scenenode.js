/**
 * @export{class} SceneNode
 */
define( function( require ){

    var Node = require("./node");
    var Pass = require("../pass");
    var FrameBuffer = require("../../framebuffer");

    var frameBuffer = new FrameBuffer();

    var SceneNode = Node.derive( function(){
        return {
            scene : null,
            camera : null
        }
    }, {
        render : function( renderer, texture ){
            if( texture ){
                frameBuffer.attach( renderer.gl, texture );
                frameBuffer.bind( renderer )
            }
            renderer.render( this.scene, this.camera );
            if( texture ){
                frameBuffer.unbind( renderer );
            }
        }
    })

    return SceneNode;
} )