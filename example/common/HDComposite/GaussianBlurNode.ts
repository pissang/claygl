import { FilterCompositeNode, GroupCompositeNode, Renderer } from 'claygl';
import { gaussianBlurCompositeFragment } from 'claygl/shaders';

interface GaussianBlurCompositeNodeOpts {
  downscale?: number;
  blurSize?: number;
}

class GaussianBlurCompositeNode extends GroupCompositeNode<'colorTex', 'color'> {
  private _blurH = new FilterCompositeNode<typeof gaussianBlurCompositeFragment, 'color'>(
    gaussianBlurCompositeFragment
  );
  private _blurV = new FilterCompositeNode<typeof gaussianBlurCompositeFragment, 'color'>(
    gaussianBlurCompositeFragment
  );

  constructor(opts?: GaussianBlurCompositeNodeOpts) {
    super();

    opts = {
      downscale: 1,
      blurSize: 1,
      ...opts
    };

    const blurV = this._blurV;
    const blurH = this._blurH;

    blurH.inputs = {
      colorTex: this.getGroupInput('colorTex')
    };
    blurH.outputs = {
      color: {}
    };
    blurV.inputs = {
      colorTex: blurH
    };
    blurV.outputs = {
      color: this.getGroupOutput('color')
    };
    [blurH, blurV].forEach((blurPass) => {
      blurPass.outputs!.color.scale = 1 / opts!.downscale!;
      blurPass.material.set('blurSize', opts!.blurSize!);
    });

    blurV.material.set('blurDir', 1);

    this.outputs = {
      color: {}
    };

    this.addNode(blurH);
    this.addNode(blurV);
  }

  prepare(renderer: Renderer): void {}
}

export default GaussianBlurCompositeNode;
