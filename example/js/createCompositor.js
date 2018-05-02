define(function (require) {
    var clay = require('../../dist/claygl');
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
        opt.enableBloom = opt.enableBloom == null ? true : opt.enableBloom;
        opt.enableLensflare = opt.enableLensflare == null ? true : opt.enableLensflare;


        var compositor = clay.compositor.createCompositor(json, {
            textureRootPath: 'assets/fx'
        });
        if (opt.scene) {
            var sceneNode = new clay.compositor.SceneNode({
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
            var textureNode = new clay.compositor.TextureNode({
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

        var finalCompositeNode = compositor.getNodeByName('composite');

        var lensColorTex = new clay.Texture2D();
        lensColorTex.load('assets/textures/lensflare/lenscolor.png');
        var lensDirtTex = new clay.Texture2D();
        lensDirtTex.load('assets/textures/lensflare/lensdirt2.jpg');

        compositor.getNodeByName('lensflare').setParameter('lenscolor', lensDirtTex);
        finalCompositeNode.setParameter('lensdirt', lensDirtTex);

        // Inject methods
        compositor.enableBloom = function () {
            finalCompositeNode.inputs.bloom = 'bloom_composite';
            compositor.dirty();
        };

        compositor.disableBloom = function () {
            finalCompositeNode.inputs.bloom = null;
            compositor.dirty();
        };

        compositor.enableLensflare = function () {
            finalCompositeNode.inputs.lensflare = 'lensflare_blur_v';
            compositor.dirty();
        };

        compositor.disableLensflare = function () {
            finalCompositeNode.inputs.lensflare = null;
            compositor.dirty();
        };

        opt.enableBloom ? compositor.enableBloom() : compositor.disableBloom();
        opt.enableLensflare ? compositor.enableLensflare() : compositor.disableLensflare();

        if (opt.stereo) {
            compositor.nodes.forEach(function (node) {
                node.shaderDefine && node.shaderDefine('STEREO');
            });
        }

        return compositor;
    };

    return createCompositor;
});