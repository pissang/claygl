define( function(require){

    var Node = require('./node');

    var Scene = Node.derive( function(){
        return {

            // Global material of scene
            material : null,

            // Properties to save the light information in the scene
            // Will be set in the render function
            lightNumber : {},
            lightUniforms : {},
            // Filter function.
            // Called each render pass to omit the mesh don't want
            // to be rendered on the screen
            filter : null
        }
    },{
        
    });

    return Scene;
} )