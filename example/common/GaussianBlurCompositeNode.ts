import { FilterCompositeNode, GroupCompositeNode } from 'claygl';
import { gaussianBlurCompositeFragment } from 'claygl/shaders';
import { assign } from '../../src/core/util';

interface GaussianBlurCompositeNodeOpts {
  downscale?: number;
  blurSize?: number;
}

class GaussianBlurCompositeNode extends GroupCompositeNode<'texture', 'color'> {
  private _blurH = new FilterCompositeNode<'color'>(gaussianBlurCompositeFragment);
  private _blurV = new FilterCompositeNode<'color'>(gaussianBlurCompositeFragment);

  constructor(opts?: GaussianBlurCompositeNodeOpts) {
    super();

    opts = assign(
      {},
      {
        downscale: 1,
        blurSize: 1
      } as GaussianBlurCompositeNodeOpts,
      opts
    );

    const blurV = this._blurV;
    const blurH = this._blurH;

    blurV.inputs = {
      texture: blurH
    };

    [blurH, blurV].forEach((blurPass) => {
      blurPass.outputs = {
        color: {
          scale: 1 / opts!.downscale!
        }
      };
      blurPass.material.set('blurSize', opts!.blurSize!);
    });

    blurV.material.set('blurDir', 1);

    this.addNode(blurH, {
      texture: 'texture'
    });
    this.addNode(blurV, undefined, {
      color: 'color'
    });
  }
}

export default GaussianBlurCompositeNode;
