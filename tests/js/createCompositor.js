define(function (require) {
    var qtek = require('qtek');
    var json = JSON.parse(require('text!../assets/fx/composite.json'));

    var parameterNodeMap = {
        'bloomIntensity': 'tonemapping',
        'exposure': 'tonemapping',
        'focalDist': 'coc',
        'focalRange': 'coc',
        'fstop': 'coc'
    };


    // {
    //     scene: scene,
    //     camera: camera,
    //     depthTexture: null,

    //     enableBloom: true,
    //     enableLensflare: true,
    //     enableDepthOfField: true
    // }

    var createCompositor = function (opt) {
        opt = opt || {};
        var loader = new qtek.loader.FX({
            textureRootPath: 'assets/fx'
        });
        opt.enableBloom = opt.enableBloom == null ? true : opt.enableBloom;
        opt.enableLensflare = opt.enableLensflare == null ? true : opt.enableLensflare;
        opt.enableDepthOfField = opt.enableDepthOfField == null ? false : opt.enableDepthOfField;


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

        var tonemappingNode = compositor.getNodeByName('tonemapping');
        var cocNode = compositor.getNodeByName('coc');

        var lensColorTex = new qtek.Texture2D();
        lensColorTex.load('assets/textures/lensflare/lenscolor.png');
        var lensDirtTex = new qtek.Texture2D();
        lensDirtTex.load('assets/textures/lensflare/lensdirt2.jpg');

        compositor.getNodeByName('lensflare').setParameter('lensColor', lensDirtTex);
        tonemappingNode.setParameter('lensdirt', lensDirtTex);

        // Inject methods
        compositor.enableBloom = function () {
            tonemappingNode.inputs.bloom = 'bright_upsample_full_blend';
            compositor.dirty();
        };

        compositor.disableBloom = function () {
            tonemappingNode.inputs.bloom = null;
            compositor.dirty();
        };

        compositor.enableLensflare = function () {
            tonemappingNode.inputs.lensflare = 'lensflare_blur_v';
            compositor.dirty();
        };

        compositor.disableLensflare = function () {
            tonemappingNode.inputs.lensflare = null;
            compositor.dirty();
        };

        compositor.enableDepthOfField = function () {
            tonemappingNode.inputs.texture = 'dof_composite';
            compositor.dirty();
        };

        compositor.disableDepthOfField = function () {
            tonemappingNode.inputs.texture = 'source';
            compositor.dirty();
        };

        compositor.setDepthTexture = function (depthTexture) {
            cocNode.setParameter('depth', depthTexture);
        };

        opt.enableBloom ? compositor.enableBloom() : compositor.disableBloom();
        opt.enableLensflare ? compositor.enableLensflare() : compositor.disableLensflare();
        opt.enableDepthOfField ? compositor.enableDepthOfField() : compositor.disableDepthOfField();

        compositor.setDepthTexture(opt.depthTexture);

        return compositor;
    };

    return createCompositor;
});