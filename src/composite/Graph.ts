import CompositeNode, { CompositeNodeInput } from './CompositeNode';

class Graph {
  nodes: CompositeNode[] = [];

  /**
   * @param node
   */
  addNode(node: CompositeNode) {
    if (this.nodes.indexOf(node) >= 0) {
      return;
    }

    this.nodes.push(node);
  }
  /**
   * @param node
   */
  removeNode(node: CompositeNode | string) {
    if (typeof node === 'string') {
      node = this.getNodeByName(node)!;
    }
    const nodes = this.nodes;
    const idx = nodes.indexOf(node);
    if (idx >= 0) {
      nodes.splice(idx, 1);
    }
  }
  /**
   * @param name
   * @return
   */
  getNodeByName(name: string): CompositeNode | undefined {
    return this.nodes.find((node) => node.name === name);
  }
  /**
   * Update links of graph
   */
  update() {
    const nodes = this.nodes;

    nodes.forEach((node) => node.clear());
    // Traverse all the nodes and build the graph
    nodes.forEach((node) => {
      Object.keys(node.inputs || {}).forEach((inputName) => {
        let fromPinInfo = node.inputs![inputName];
        if (!fromPinInfo) {
          return;
        }
        if (!node.validateInput(inputName)) {
          console.warn('Pin ' + node.name + '.' + inputName + ' not used.');
          return;
        }
        if (typeof fromPinInfo === 'string' || fromPinInfo instanceof CompositeNode) {
          fromPinInfo = {
            node: fromPinInfo
          };
        }

        const fromPin = this.findPin(fromPinInfo);
        if (fromPin) {
          node.link(inputName, fromPin.node, fromPin.pin);
        } else {
          console.warn(
            'Pin of ' +
              fromPinInfo.node +
              (fromPinInfo.output ? '.' + fromPinInfo.output : '') +
              ' not exist'
          );
        }
      });
    });
  }

  findPin(input: CompositeNodeInput) {
    let node;
    // Try to take input as a directly a node
    if (typeof input === 'string' || input instanceof CompositeNode) {
      input = {
        node: input
      };
    }

    if (typeof input.node === 'string') {
      for (let i = 0; i < this.nodes.length; i++) {
        const tmp = this.nodes[i];
        if (tmp.name === input.node) {
          node = tmp;
        }
      }
    } else {
      node = input.node;
    }
    if (node) {
      let inputPin = input.output;
      if (!inputPin) {
        // Use first pin defaultly
        if (node.outputs) {
          inputPin = Object.keys(node.outputs)[0];
        }
      }
      if (node.outputs && node.outputs[inputPin!]) {
        return {
          node: node,
          pin: inputPin!
        };
      }
    }
  }
}
export default Graph;
