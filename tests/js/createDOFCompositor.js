define(function (require) {
    var qtek = require('qtek');

    var DOWNSAMPLE_REPEAT = 2;

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
                    parameters: getCommonParameters(1)
                }
            }
        });
        var premutiplyNode = new qtek.compositor.Node({
            name: 'premutiply',
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
                    parameters: getCommonParameters(1)
                }
            }
        });

        var downSampleNodes = [];
        var cocDownSampleNodes = [];
        var downSampleScale = 1;
        for (var i = 0; i < DOWNSAMPLE_REPEAT; i++) {
            // Downsample input texture
            var textureSize = [renderer.getWidth() / downSampleScale, renderer.getHeight() / downSampleScale];
            downSampleScale *= 2;
            var downSampleNode = new qtek.compositor.Node({
                name: 'downsample' + i,
                shader: qtek.Shader.source('qtek.compositor.downsample'),
                inputs: {
                    // FIXME blur after premultiply will have white edge
                    // texture: i === 0 ? 'premutiply' : 'downsample' + (i - 1)
                    texture: i === 0 ? 'scene' : 'downsample' + (i - 1)
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

            // Downsample coc
            var cocDownSampleNode = new qtek.compositor.Node({
                name: 'coc_downsample' + i,
                shader: qtek.Shader.source('dof.min_coc'),
                inputs: {
                    coc: i === 0 ? 'coc' : 'coc_downsample' + (i - 1)
                },
                outputs: {
                    color: {
                        parameters: getCommonParameters(downSampleScale)
                    }
                }
            });
            cocDownSampleNode.setParameter('textureSize', textureSize);
            cocDownSampleNodes.push(cocDownSampleNode);
            compositor.addNode(cocDownSampleNode);
        }
        var lastDownSampleName = 'downsample' + (i - 1);
        var lastCocDownSampleName = 'coc_downsample' + (i - 1);


        function createBlurNodes(target) {
            var blurNodes = [];
            var prefix = target ? target + '_' : '';
            // Separable hexagonal blur
            var blurNode1 = new qtek.compositor.Node({
                name: prefix + 'blur_1',
                shader: qtek.Shader.source('dof.hexagonal_blur_1'),
                inputs: {
                    texture: target === 'coc' ? lastCocDownSampleName : lastDownSampleName,
                    coc: target === 'coc' ? null : 'coc'
                },
                outputs: {
                    color: {
                        parameters: getCommonParameters(2)
                    }
                }
            });
            var blurNode2 = new qtek.compositor.Node({
                name: prefix + 'blur_2',
                shader: qtek.Shader.source('dof.hexagonal_blur_2'),
                inputs: {
                    texture: target === 'coc' ? lastCocDownSampleName : lastDownSampleName,
                    coc: target === 'coc' ? null : 'coc'
                },
                outputs: {
                    color: {
                        parameters: getCommonParameters(2)
                    }
                }
            });
            var blurNode3 = new qtek.compositor.Node({
                name: prefix + 'blur_3',
                shader: qtek.Shader.source('dof.hexagonal_blur_3'),
                inputs: {
                    texture1: prefix + 'blur_1',
                    texture2: prefix + 'blur_2',
                    coc: target === 'coc' ? null : 'coc'
                },
                outputs: {
                    color: {
                        parameters: getCommonParameters(2)
                    }
                }
            });

            blurNodes.push(blurNode2);
            blurNodes.push(blurNode3);
            blurNodes.push(blurNode1);

            var textureSize = [
                renderer.getWidth() / downSampleScale,
                renderer.getHeight() / downSampleScale
            ];
            blurNode1.setParameter('textureSize', textureSize);
            blurNode2.setParameter('textureSize', textureSize);
            blurNode3.setParameter('textureSize', textureSize);

            if (target === 'near') {
                blurNode1.shaderDefine('BLUR_NEARFIELD');
                blurNode2.shaderDefine('BLUR_NEARFIELD');
                blurNode3.shaderDefine('BLUR_NEARFIELD');
            }
            else if (target === 'coc') {
                blurNode1.shaderDefine('BLUR_COC');
                blurNode2.shaderDefine('BLUR_COC');
                blurNode3.shaderDefine('BLUR_COC');
            }

            return blurNodes;
        }
        var blurNodes = createBlurNodes()
            .concat(createBlurNodes('near'))
            .concat(createBlurNodes('coc'));

        var upSampleNode = new qtek.compositor.Node({
            name: 'upsample',
            shader: qtek.Shader.source('qtek.compositor.upsample'),
            inputs: {
                texture: 'blur_3'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(1)
                }
            }
        });

        upSampleNode.setParameter('textureSize', [renderer.getWidth() / 2, renderer.getHeight() / 2]);

        var upSampleNearNode = new qtek.compositor.Node({
            name: 'upsample_near',
            shader: qtek.Shader.source('qtek.compositor.upsample'),
            inputs: {
                texture: 'near_blur_3'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(1)
                }
            }
        });


        var compositeNode = new qtek.compositor.Node({
            name: 'composite',
            shader: qtek.Shader.source('dof.composite'),
            inputs: {
                original: {
                    node: 'scene',
                    pin: 'color'
                },
                blurred: 'upsample',
                nearfield: 'upsample_near',
                coc: 'coc',
                nearcoc: 'coc_blur_3'
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
            name: 'tonemapping',
            shader: qtek.Shader.source('qtek.compositor.hdr.tonemapping'),
            inputs: {
                'texture': 'composite'
            }
        });
        toneMappingNode.setParameter('exposure', 2.0);
        cocNode.setParameter('zNear', camera.near);
        cocNode.setParameter('zFar', camera.far);

        compositor.addNode(premutiplyNode);
        compositor.addNode(sceneNode);
        compositor.addNode(cocNode);
        compositor.addNode(compositeNode);
        compositor.addNode(toneMappingNode);

        compositor.addNode(upSampleNode);
        compositor.addNode(upSampleNearNode);

        premutiplyNode.shaderDefine('RGBM');
        compositeNode.shaderDefine('RGBM');
        toneMappingNode.shaderDefine('RGBM_DECODE');
        upSampleNode.shaderDefine('RGBM');
        upSampleNearNode.shaderDefine('RGBM');
        downSampleNodes.forEach(function (downSampleNode) {
            downSampleNode.shaderDefine('RGBM');
        });
        blurNodes.forEach(function (blurNode) {
            compositor.addNode(blurNode);
            blurNode.shaderDefine('RGBM');
        });

        // Inject method
        compositor.getBlurNodes = function () {
            return blurNodes.slice();
        };


        return compositor;
    }

    return createDOFCompositor;
});