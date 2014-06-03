///<reference path="Node.d.ts" />
///<reference path="Material.d.ts" />
///<reference path="Geometry.d.ts" />
///<reference path="Skeleton.d.ts" />
declare module qtek {

    interface IRenderableOption extends INodeOption {
        
        material?: Material;
        geometry?: Geometry;
        
        mode?: number;
        
        visible?: boolean;
        
        lineWidth?: number;

        culling?: boolean;
        cullFace?: number;
        frontFace?: number;
        
        frustumCulling?: boolean;
        
        castShadow?: boolean;
        receiveShadow?: boolean;
    }

    interface IRenderableRenderInfo {
        faceNumber: number;
        vertexNumber: number;
        drawCallNumber: number;
    }

    export class Renderable extends Node {

        constructor(option?: IRenderableOption);

        material: Material;
        geometry: Geometry;
        
        mode: number;
        
        visible: boolean;
        
        lineWidth: number;

        culling: boolean;
        cullFace: number;
        frontFace: number;
        
        frustumCulling: boolean;
        
        castShadow: boolean;
        receiveShadow: boolean;

        isRenderable(): boolean;

        render(gl: WebGLRenderingContext, globalMaterial?: Material): IRenderableRenderInfo;

        clone(): Renderable;

        // Enums
        static POINTS: number;
        static LINES: number;
        static LINE_LOOP: number;
        static LINE_STRIP: number;
        static TRIANGLES: number;
        static TRIANGLE_STRIP: number;
        static TRIANGLE_FAN: number;

        static BACK: number;
        static FRONT: number;
        static FRONT_AND_BACK: number;
        static CW: number;
        static CCW: number;
    }
}