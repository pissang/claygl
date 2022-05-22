import { FilterCompositeNode, GroupCompositeNode } from 'claygl';
import { gaussianBlurCompositeFragment } from 'claygl/shaders';

interface GaussianBlurCompositeNodeOpts {
  downscale?: number;
  blurSize?: number;
}

class GaussianBlurCompositeNode extends GroupCompositeNode<'texture', 'color'> {
  private _blurH = new FilterCompositeNode<'color', typeof gaussianBlurCompositeFragment>(
    gaussianBlurCompositeFragment
  );
  private _blurV = new FilterCompositeNode<'color', typeof gaussianBlurCompositeFragment>(
    gaussianBlurCompositeFragment
  );

  constructor(opts?: GaussianBlurCompositeNodeOpts) {
    super();

    opts = Object.assign(
      {},
      {
        downscale: 1,
        blurSize: 1
      } as GaussianBlurCompositeNodeOpts,
      opts
    );

    const blurV = this._blurV;
    const blurH = this._blurH;

    blurH.inputs = {
      texture: this.getGroupInput('texture')
    };
    blurH.outputs = {
      color: {}
    };
    blurV.inputs = {
      texture: blurH
    };
    blurV.outputs = {
      color: this.getGroupOutput('color')
    };
    [blurH, blurV].forEach((blurPass) => {
      blurPass.outputs!.color.scale = 1 / opts!.downscale!;
      blurPass.material.set('blurSize', opts!.blurSize!);
    });

    blurV.material.set('blurDir', 1);

    this.addNode(blurH);
    this.addNode(blurV);
  }
}

export default GaussianBlurCompositeNode;
