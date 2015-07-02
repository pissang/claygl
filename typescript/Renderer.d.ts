///<reference path="Camera.d.ts" />
///<reference path="Scene.d.ts" />
///<reference path="Mesh.d.ts" />
///<reference path="Geometry.d.ts" />
///<reference path="Material.d.ts" />
///<reference path="Shader.d.ts" />
///<reference path="Node.d.ts" />
///<reference path="Texture.d.ts" />
///<reference path="FrameBuffer.d.ts" />
///<reference path="math/Vector2.d.ts" />
declare module qtek {
    
    interface IRendererOption {
        canvas?: HTMLCanvasElement;
        width?: number;
        height?: number;
        devicePixelRatio?: number;
        color?: number[];
        alhpa?: boolean;
        depth?: boolean;
        stencil?: boolean;
        antialias?: boolean;
        premultipliedAlpha?: boolean;
        preserveDrawingBuffer?: boolean;
    }

    interface IRenderInfo {
        faceNumber: number;
        vertexNumber: number;
        drawCallNumber: number;
        meshNumber: number;
    }

    interface IViewport {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    export class Renderer {

        constructor(option?: IRendererOption);

        canvas: HTMLCanvasElement;

        devicePixelRatio: number;

        color: any;

        clear: number;

        alhpa: boolean;

        depth: boolean;

        stencil: boolean;
        
        antialias: boolean;

        premultipliedAlpha: boolean;

        preserveDrawingBuffer: boolean;

        throwShaderError: boolean;

        gl: WebGLRenderingContext;

        viewport: IViewport;
        
        render(scene: Scene, camera: Camera, notUpdateScene?: boolean, preZ?: boolean) : IRenderInfo;
        
        renderQueue(queue: Renderable[], camera: Camera, globalMaterial?: Material, preZ?: boolean): IRenderInfo;
        
        getWidth(): number;
        
        getHeight(): number;
        
        getDevicePixelRatio(): number;
        
        getViewportAspect(): number;

        resize(width: number, height: number): void;

        setDevicePixelRatio(devicePixelRatio: number): void;

        setViewport(x: number, y: number, width: number, height: number): void;

        setViewport(viewport: IViewport): void;

        saveViewport(): void;

        restoreViewport(): void;

        saveClear(): void;

        restoreClear(): void;

        disposeShader(shader: Shader): void;

        disposeGeometry(geometry: Geometry): void;

        disposeTexture(texture: Texture): void;

        disposeNode(node: Node): void;

        disposeScene(scene: Scene): void;

        disposeFrameBuffer(frameBuffer: FrameBuffer): void;

        dispose(): void;

        screenToNdc(x: number, y: number, out?: math.Vector2): math.Vector2;

        // Events
        on(name: 'beforerender', handler: (renderer?: Renderer, scene?: Scene, camera?: Camera) => void, context?: any): void;
        on(name: 'beforerender:opaque', handler: (renderer?: Renderer, queue?: Renderable[]) => void, context?: any): void;
        on(name: 'beforerender:transparent', handler: (renderer?: Renderer, queue?: Renderable[]) => void, context?: any): void;
        on(name: 'afterrender:opaque', handler: (renderer?: Renderer, queue?: Renderable[], renderInfo?: IRenderInfo) => void, context?: any): void;
        on(name: 'afterrender:transparent', handler: (renderer?: Renderer, queue?: Renderable[], renderInfo?: IRenderInfo) => void, context?: any): void;
        on(name: 'afterrender', handler: (renderer?: Renderer, scene?: Scene, camera?: Camera, renderInfo?: IRenderInfo) => void, context?: any): void;
        on(name: string, handler: Function, context?: any): void;

        before(name: 'render', handler: (renderer?: Renderer, scene?: Scene, camera?: Camera) => void, context?: any): void;
        before(name: 'render:opaque', handler: (renderer?: Renderer, queue?: Renderable[]) => void, context?: any): void;
        before(name: 'render:transparent', handler: (renderer?: Renderer, queue?: Renderable[]) => void, context?: any): void;
        after(name: 'render:opaque', handler: (renderer?: Renderer, queue?: Renderable[], renderInfo?: IRenderInfo) => void, context?: any): void;
        after(name: 'render:transparent', handler: (renderer?: Renderer, queue?: Renderable[], renderInfo?: IRenderInfo) => void, context?: any): void;
        after(name: 'render', handler: (renderer?: Renderer, scene?: Scene, camera?: Camera, renderInfo?: IRenderInfo) => void, context?: any): void;
        before(name: string, handler: Function, context?: any): void;
        after(name: string, handler: Function, context?: any): void;

        static opaqueSortFunc(a: Renderable, b: Renderable): boolean;

        static transparentSortFunc(a: Renderable, b: Renderable): boolean;

        static COLOR_BUFFER_BIT: number;
        static DEPTH_BUFFER_BIT: number;
        static STENCIL_BUFFER_BIT: number;
    }
}