import CompositeNode from './CompositeNode';
import type Texture2D from '../Texture2D';
import Renderer from '../Renderer';

class TextureNode extends CompositeNode {
  texture: Texture2D;

  // Texture node must have output without parameters
  outputs = {
    color: {}
  };

  constructor(texture: Texture2D) {
    super();
    this.texture = texture;
  }

  renderAndOutputTexture(renderer: Renderer, name: string) {
    return this.texture;
  }

  getOutputTexture(name: string) {
    return this.texture;
  }

  // Do nothing
  beforeFrame() {}
  render() {}
  afterFrame() {}
}

export default TextureNode;
