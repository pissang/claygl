define(function(require) {

    var Base = require('core/Base');

    var Layer = Base.derive(function() {
        return {
            renderer : null,
            scene : null,
            camera : null,

            picking : null
        }
    }, {
        render : function() {
            if (this.picking) {
                this.picking.update(this.scene, this.camera);
            }
            this.renderer.render(this.scene, this.camera);
        },

        resize : function(width, height) {
            if (this.renderer) {
                this.renderer.resize(width, height);
            }
            if (this.picking) {
                this.picking.resize(width, height);
            }
        },

        setZ : function(z) {
            this.z = z;
            this.renderer.canvas.style.zIndex = z;
        },

        pick : function(x, y) {
            // Mouse picking
            if (this.picking) {
                return this.picking.pick(x, y);
            }
        }
    });

    return Layer;
} )