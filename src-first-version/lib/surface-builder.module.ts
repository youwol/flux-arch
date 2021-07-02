
import { arche, pack } from './factory';
import { Flux, BuilderView, ModuleFlow, Pipe, Schema } from '@youwol/flux-lib-core'
import { Group, Mesh, Object3D } from 'three';
import { buildSurfacesFromThree } from './arche-builders'

export namespace SurfaceBuilder {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `

    type ArcheSurface = any

    @Schema({
        pack: pack,
        description: "Persistent Data of SurfaceBuilder"
    })
    export class PersistentData {

        constructor({} = {}) {}
    }

    @Flux({
        pack: pack,
        namespace: SurfaceBuilder,
        id: "SurfaceBuilder",
        displayName: "SurfaceBuilder",
        description: "A surface builder from Three.js object"
    })
    @BuilderView({
        namespace: SurfaceBuilder,
        icon: svgIcon
    })
    export class Module extends ModuleFlow {

        surface$: Pipe<Array<ArcheSurface> | ArcheSurface>

        constructor(params) {
            super(params)

            this.addInput("objects",  inputDescription, this.createSurfaces  )
            this.surface$ = this.addOutput("surface", {})
        }

        createSurfaces(data: Object3D | Array<any> , config: PersistentData, context: any){
            
            let report = context.__report
            let surfaces = buildSurfacesFromThree(data, report)            
            this.surface$.next({data: surfaces.length > 1 ? surfaces : surfaces[0] })
        }
    }


    let inputDescription = {
        description: `Triggerring this input construct surface(s) for use in Arche computations from Three object(s)`,
        mandatory: {
            description: "provide a 3D object(s)",
            oneOf: [
                {
                    description: "provide one Three.Mesh",
                    test: (input) => input instanceof Mesh
                },
                {
                    description: "provide one Three.Group",
                    test: (input) => input instanceof Group
                },
                {
                    description: "provide some surfaces (Three.Mesh or Three.Group) in an array",
                    test: (input) => Array.isArray(input) &&
                        input.filter(d => (d instanceof Mesh) || (d instanceof Group)).length > 0
                }
            ],
        }
    }
}
