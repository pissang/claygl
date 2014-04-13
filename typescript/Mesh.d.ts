///<reference path="Node.d.ts" />
///<reference path="Material.d.ts" />
///<reference path="Geometry.d.ts" />
///<reference path="Skeleton.d.ts" />
///<reference path="webgl.d.ts" />
declare module qtek {

    interface IMeshOption extends INodeOption {
        
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

    interface IMeshRenderInfo {
        faceNumber: number;
        vertexNumber: number;
        drawCallNumber: number;
    }

    export class Mesh extends Node {

        constructor(option?: IMeshOption);

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

        joints: number[];

        skeleton: Skeleton;

        isRenderable(): boolean;

        render(gl: WebGLRenderingContext, globalMaterial?: Material): IMeshRenderInfo;

        clone(): Mesh;
    }
}