define(function (require) {
    var qtek = require('qtek');

    var DOWNSAMPLE_REPEAT = 1;

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
        var cocNode = new qtek.compositor.FilterNode({
            name: 'coc',
            shader: qtek.Shader.source('qtek.compositor.dof.coc'),
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
        var premultiplyNode = new qtek.compositor.FilterNode({
            name: 'premultiply',
            shader: qtek.Shader.source('qtek.compositor.dof.premultiply'),
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
            var downSampleNode = new qtek.compositor.FilterNode({
                name: 'downsample' + i,
                shader: qtek.Shader.source('qtek.compositor.dof.downsample'),
                inputs: {
                    // FIXME blur after premultiply will have white edge
                    texture: i === 0 ? 'scene' : 'downsample' + (i - 1),
                    coc: 'coc'
                    // texture: i === 0 ? 'scene' : 'downsample' + (i - 1)
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
            var cocDownSampleNode = new qtek.compositor.FilterNode({
                name: 'coc_downsample' + i,
                shader: qtek.Shader.source('qtek.compositor.dof.min_coc'),
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
            var blurNode1 = new qtek.compositor.FilterNode({
                name: prefix + 'blur_1',
                shader: qtek.Shader.source('qtek.compositor.dof.hexagonal_blur_1'),
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
            var blurNode2 = new qtek.compositor.FilterNode({
                name: prefix + 'blur_2',
                shader: qtek.Shader.source('qtek.compositor.dof.hexagonal_blur_2'),
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
            var blurNode3 = new qtek.compositor.FilterNode({
                name: prefix + 'blur_3',
                shader: qtek.Shader.source('qtek.compositor.dof.hexagonal_blur_3'),
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

            blurNode1.shaderDefine('KERNEL_SIZE', 10);
            blurNode2.shaderDefine('KERNEL_SIZE', 10);
            blurNode3.shaderDefine('KERNEL_SIZE', 10);

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

        var upsampleTextureSize = [renderer.getWidth() / 2, renderer.getHeight() / 2];
        var upSampleNode = new qtek.compositor.FilterNode({
            name: 'upsample',
            shader: qtek.Shader.source('qtek.compositor.dof.upsample'),
            inputs: {
                texture: 'blur_3',
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(1)
                }
            }
        });

        upSampleNode.setParameter('textureSize', upsampleTextureSize);

        var upSampleNearNode = new qtek.compositor.FilterNode({
            name: 'upsample_near',
            shader: qtek.Shader.source('qtek.compositor.dof.upsample'),
            inputs: {
                texture: 'near_blur_3',
                coc: 'coc'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(1)
                }
            }
        });
        upSampleNearNode.setParameter('textureSize', upsampleTextureSize);


        var upSampleCocNode = new qtek.compositor.FilterNode({
            name: 'upsample_coc',
            shader: qtek.Shader.source('qtek.compositor.dof.coc_upsample'),
            inputs: {
                coc: 'coc_blur_3'
            },
            outputs: {
                color: {
                    parameters: getCommonParameters(1)
                }
            }
        });
        upSampleCocNode.setParameter('textureSize', upsampleTextureSize);


        var dofCompositeNode = new qtek.compositor.FilterNode({
            name: 'dof_composite',
            shader: qtek.Shader.source('qtek.compositor.dof.composite'),
            inputs: {
                original: {
                    node: 'scene',
                    pin: 'color'
                },
                blurred: 'upsample',
                nearfield: 'upsample_near',
                coc: 'coc',
                nearcoc: 'upsample_coc'
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
        var compositeNode = new qtek.compositor.FilterNode({
            name: 'composite',
            shader: qtek.Shader.source('qtek.compositor.hdr.composite'),
            inputs: {
                'texture': 'dof_composite'
            }
        });
        compositeNode.setParameter('exposure', 2.0);
        cocNode.setParameter('zNear', camera.near);
        cocNode.setParameter('zFar', camera.far);

        compositor.addNode(premultiplyNode);
        compositor.addNode(sceneNode);
        compositor.addNode(cocNode);
        compositor.addNode(dofCompositeNode);
        compositor.addNode(compositeNode);

        compositor.addNode(upSampleNode);
        compositor.addNode(upSampleNearNode);
        compositor.addNode(upSampleCocNode);

        premultiplyNode.shaderDefine('RGBM');
        dofCompositeNode.shaderDefine('RGBM');
        compositeNode.shaderDefine('RGBM_DECODE');
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