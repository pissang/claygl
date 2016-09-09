define(function (require) {
    var qtek = require('qtek');
    var json = JSON.parse(require('text!../assets/fx/hdr.json'));

    var createHDRCompositor = function (opt) {
        opt = opt || {};
        var loader = new qtek.loader.FX({
            textureRootPath: 'assets/fx'
        });
        var compositor = loader.parse(json);
        if (opt.scene) {
            var sceneNode = new qtek.compositor.SceneNode({
                name: 'source',
                scene: opt.scene,
                camera: opt.camera,
                outputs: {
                    color: {
                        parameters: {
                            width: function (renderer) {return renderer.getWidth();},
                            height: function (renderer) {return renderer.getHeight();}
                        }
                    }
                }
            });
            compositor.addNode(sceneNode);
        }
        else if (opt.texture) {
            var textureNode = new qtek.compositor.TextureNode({
                name: 'source',
                texture: opt.texture,
                outputs: {
                    color: {
                        parameters: {
                            width: function () {return opt.texture.width;},
                            height: function () {return opt.texture.height;}
                        }
                    }
                }
            });
            compositor.addNode(textureNode);
        }

        return compositor;
    };

    return createHDRCompositor;
});