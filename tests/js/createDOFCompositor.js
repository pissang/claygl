define(function (require) {
    var qtek = require('qtek');

    qtek.Shader.import(require('text!../shader/dof.essl'));

    function getCommonParameters(downScale) {
        downScale = downScale || 1;
        var parameters = {
            // FIXME RGBM will have artifacts in highlight edge if using bilinear filter
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST,
            width: function (renderer) {
                return renderer.getWidth() / downScale;
            },
            height: function (renderer) {
                return renderer.getHeight() / downScale;
            }
        };
        return parameters;
    }

    function createDOFCompositor(renderer, scene, camera) {
        var compositor = new qtek.compositor.Compositor();
        var sceneNode = new qtek.compositor.SceneNode({
            name: 'scene',
            scene: scene,
            camera: camera,
            preZ: false,
            outputs: {
                color: {
                    parameters: getCommonParameters()
                },
                depth: {
                    attachment: 'DEPTH_ATTACHMENT',
                    parameters: {
                        width: function(renderer) {return renderer.getWidth();},
                        height: function(renderer) {return renderer.getHeight();},
                        type: qtek.Texture.UNSIGNED_SHORT,
                        format: qtek.Texture.DEPTH_COMPONENT
                    }
                }
            }
        });
        var cocNode = new qtek.compositor.Node({
            name: 'coc',
            shader: qtek.Shader.source('dof.coc'),
            inputs: {
                depth: {
                    node: 'scene',
                    pin: 'depth'
                }
            },
            outputs: {
                color: {
                    parameters: getCommonParameters()
                }
            }
        });
        var premultiplyNode = new qtek.compositor.Node({
            name: 'premultiply',
            shader: qtek.Shader.source('dof.premutiply'),
            inputs: {
                texture: {
                    node: 'scene',
                    pin: 'color'
                },
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters()
                }
            }
        });

        var downSampleRepeat = 2;
        var downSampleNodes = [];
        var downSampleScale = 1;
        for (var i = 0; i < downSampleRepeat; i++) {
            var textureSize = [renderer.getWidth() / downSampleScale, renderer.getHeight() / downSampleScale];
            downSampleScale *= 2;
            var downSampleNode = new qtek.compositor.Node({
                name: 'downSample' + i,
                shader: qtek.Shader.source('qtek.compositor.downsample'),
                inputs: {
                    texture: i === 0 ? 'premultiply' : 'downSample' + (i - 1)
                },
                outputs: {
                    color: {
                        parameters: getCommonParameters(downSampleScale)
                    }
                }
            });
            downSampleNode.setParameter('textureSize', textureSize);
            downSampleNodes.push(downSampleNode);
            compositor.addNode(downSampleNode);
        }


        var blurNodes = [];
        // Separable hexagonal blur
        var blurNode1 = new qtek.compositor.Node({
            name: 'blur_1',
            shader: qtek.Shader.source('dof.hexagonal_blur_1'),
            inputs: {
                texture: 'downSample' + (i - 1),
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(2)
                }
            }
        });
        var blurNode2 = new qtek.compositor.Node({
            name: 'blur_2',
            shader: qtek.Shader.source('dof.hexagonal_blur_2'),
            inputs: {
                texture: 'downSample' + (i - 1),
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(2)
                }
            }
        });
        var blurNode3 = new qtek.compositor.Node({
            name: 'blur_3',
            shader: qtek.Shader.source('dof.hexagonal_blur_3'),
            inputs: {
                texture1: 'blur_1',
                texture2: 'blur_2',
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(2)
                }
            }
        });

        var upSampleNode = new qtek.compositor.Node({
            name: 'upsample',
            shader: qtek.Shader.source('qtek.compositor.upsample'),
            inputs: {
                texture: 'blur_3'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(2)
                }
            }
        });

        var textureSize = [renderer.getWidth() / downSampleScale, renderer.getHeight() / downSampleScale];
        blurNode1.setParameter('textureSize', textureSize);
        blurNode2.setParameter('textureSize', textureSize);
        blurNode3.setParameter('textureSize', textureSize);
        upSampleNode.setParameter('textureSize', [renderer.getWidth() / 2, renderer.getHeight() / 2]);

        blurNodes.push(blurNode2);
        blurNodes.push(blurNode3);
        blurNodes.push(blurNode1);

        var compositeNode = new qtek.compositor.Node({
            name: 'composite',
            shader: qtek.Shader.source('dof.composite'),
            inputs: {
                original: {
                    node: 'scene',
                    pin: 'color'
                },
                blurred: 'upsample',
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: {
                        width: function(renderer) {return renderer.getWidth();},
                        height: function(renderer) {return renderer.getHeight();}
                    }
                }
            }
        });
        var toneMappingNode = new qtek.compositor.Node({
            name: 'toneMapping',
            shader: qtek.Shader.source('qtek.compositor.hdr.tonemapping'),
            inputs: {
                'texture': 'composite'
            }
        });
        toneMappingNode.setParameter('exposure', 2.0);
        cocNode.setParameter('zNear', camera.near);
        cocNode.setParameter('zFar', camera.far);

        compositor.addNode(premultiplyNode);
        compositor.addNode(sceneNode);
        compositor.addNode(cocNode);
        compositor.addNode(compositeNode);
        compositor.addNode(toneMappingNode);

        compositor.addNode(blurNode2);
        compositor.addNode(blurNode1);
        compositor.addNode(blurNode3);
        compositor.addNode(upSampleNode);

        premultiplyNode.shaderDefine('RGBM');
        compositeNode.shaderDefine('RGBM');
        toneMappingNode.shaderDefine('RGBM_DECODE');
        blurNode1.shaderDefine('RGBM');
        blurNode2.shaderDefine('RGBM');
        blurNode3.shaderDefine('RGBM');
        upSampleNode.shaderDefine('RGBM');
        downSampleNodes.forEach(function (downSampleNode) {
            downSampleNode.shaderDefine('RGBM');
        });

        // Inject method
        compositor.getBlurNodes = function () {
            return blurNodes.slice();
        };


        return compositor;
    }

    return createDOFCompositor;
});