// Bloom from https://cdn2.unrealengine.com/Resources/files/The_Technology_Behind_the_Elemental_Demo_16x9-1248544805.pdf

import { constants, FilterCompositeNode, GroupCompositeNode, Renderer } from 'claygl';
import {
  gaussianBlurCompositeFragment,
  brightCompositeFragment,
  downsampleCompositeFragment,
  blendCompositeFragment
} from 'claygl/shaders';

class BloomNode extends GroupCompositeNode<'texture', 'color'> {
  private _brightNode = new FilterCompositeNode<typeof brightCompositeFragment, 'color'>(
    brightCompositeFragment
  );
  private _downsampleNodes: FilterCompositeNode<typeof downsampleCompositeFragment, 'color'>[] = [];
  private _upsampleNodes: FilterCompositeNode<typeof gaussianBlurCompositeFragment, 'color'>[] = [];
  private _blendNodes: FilterCompositeNode<typeof blendCompositeFragment, 'color'>[] = [];

  constructor() {
    super();

    this._brightNode.inputs = {
      texture: this.getGroupInput('texture')
    };
    this._brightNode.outputs = {
      color: {
        type: constants.HALF_FLOAT_OES
      }
    };
    this.addNode(this._brightNode);

    for (let i = 0; i <= 5; i++) {
      // Downsamples
      const downsampleNode = new FilterCompositeNode(downsampleCompositeFragment);
      downsampleNode.inputs = {
        texture: i === 0 ? this._brightNode : this._downsampleNodes[i - 1]
      };
      downsampleNode.outputs = {
        color: {
          scale: 1 / 2,
          type: constants.HALF_FLOAT_OES
        }
      };
      this._downsampleNodes.push(downsampleNode);
      this.addNode(downsampleNode);
    }

    for (let i = 0; i <= 5; i++) {
      // Upsamples
      const upsampleBlurHNode = new FilterCompositeNode(gaussianBlurCompositeFragment);
      upsampleBlurHNode.inputs = {
        texture: this._downsampleNodes[5 - i]
      };
      upsampleBlurHNode.outputs = {
        color: {
          scale: 2,
          type: constants.HALF_FLOAT_OES
        }
      };
      const upsampleBlurVNode = new FilterCompositeNode(gaussianBlurCompositeFragment);
      upsampleBlurVNode.inputs = {
        texture: upsampleBlurHNode
      };
      upsampleBlurVNode.outputs = {
        color: {
          type: constants.HALF_FLOAT_OES
        }
      };
      upsampleBlurVNode.material.set('blurDir', 1);
      upsampleBlurVNode.material.set('blurSize', 1);
      upsampleBlurHNode.material.set('blurSize', 1);
      this._upsampleNodes.push(upsampleBlurVNode, upsampleBlurHNode);
      this.addNode(upsampleBlurVNode, upsampleBlurHNode);

      // Blend
      if (i > 0) {
        const blendNode = new FilterCompositeNode<typeof blendCompositeFragment, 'color'>(
          blendCompositeFragment
        );
        blendNode.inputs = {
          texture1: i === 1 ? this._upsampleNodes[i - 1] : this._blendNodes[i - 2],
          texture2: upsampleBlurVNode
        };
        blendNode.outputs = {
          color:
            i === 5
              ? this.getGroupOutput('color')
              : {
                  type: constants.HALF_FLOAT_OES
                }
        };
        this._blendNodes.push(blendNode);
        this.addNode(blendNode);
      }

      this.outputs = {
        color: {}
      };
    }
  }

  prepare(renderer: Renderer): void {}

  setBrightThreshold(threshold: number) {
    this._brightNode.material.set('threshold', threshold);
  }
  setBrightScale(scale: number) {
    this._brightNode.material.set('scale', scale);
  }
}

export default BloomNode;
