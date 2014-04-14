///<reference path="Pass.d.ts" />
///<reference path="../core/Base.d.ts" />
///<reference path="../core/container.d.ts" />
///<reference path="../Texture.d.ts" />
///<reference path="../Renderer.d.ts" />
declare module qtek {

    export module compositor {
        
        interface ICompositorNodeInput {
            // TODO
            // string
            // Node
            node: any;
            pin: string;
        }

        interface ICompositorNodeOutputParameter {
            // TODO
            // number;
            // (renderer?: Renderer): number;
            width?: any;
            // number;
            // (renderer?: Renderer): number;
            height?: any;
            type?: number;
            format?: number;
            wrapS?: number;
            wrapT?: number;
            minFilter?: number;
            magFilter?: number;
            useMipmap?: boolean;
            anisotropic?: number;
            flipY?: boolean;
        }

        interface ICompositorNodeOutput {
            // string
            // number
            attachment?: any;
            parameters?: ICompositorNodeOutputParameter;
            keepLastFrame?: boolean;
            outputLastFrame?: boolean;
        }

        interface ICompositorNodeOption {
            name?: string;
            shader: string;
            inputs: IDictionary<ICompositorNodeInput>;
            outputs?: IDictionary<ICompositorNodeOutput>;
        }

        interface ICompositorNodeLink {
            node: Node;
            pin: string;
        }

        export class Node extends qtek.core.Base {

            constructor(option: ICompositorNodeOption);

            name: string;

            inputs: IDictionary<ICompositorNodeInput>;

            outputs: IDictionary<ICompositorNodeOutput>;

            inputLinks: IDictionary<ICompositorNodeLink>;

            outputLinks: IDictionary<ICompositorNodeLink>;

            pass: Pass;

            render(renderer: Renderer): void;

            updateParameter(outputName: string, renderer: Renderer): Object;

            setParameter(name: string, value: any): void;

            getParameter(name: string): any;

            setParameters(obj: IDictionary<any>): any;

            setShader(shader: string): void;

            getOutput(renderer: Renderer, name: string): Texture;

            getOutput(name: string): Texture;

            removeReference(name: string): void;
        }
    }
}