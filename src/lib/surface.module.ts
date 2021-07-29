
import { arche, pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, freeContract, expectSome, expectAnyOf, expectInstanceOf, expectAllOf, expectSingle, contract, Context } from '@youwol/flux-core'
import { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { buildSurfacesFromThree } from './implementation/arche-builders'
import { ArchFacade } from './arche.facades';

export namespace ModuleSurface {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `

    type ArchSurface = any

    @Schema({
        pack: pack,
        description: "Persistent Data of SurfaceBuilder"
    })
    export class PersistentData {

        constructor({} = {}) {}
    }

    let contractMesh = expectSome({
        when: expectAnyOf({
            description:"Either a mesh or a group of mesh",
            when:[
                expectInstanceOf({
                    typeName: "Mesh",
                    Type: Mesh,
                    attNames: ["mesh", "object"],
                    normalizeTo: (d) => [d]
                }),
                expectInstanceOf({
                    typeName: "Group",
                    Type: Group,
                    attNames: ["mesh", "object"],
                    normalizeTo: (d: Group) => d.children.filter( child => child instanceof Mesh)
                }),
            ]
        }),
        normalizeTo: (meshes) => meshes.flat()
    })

    let contractBoundaryCondition = expectSingle({
        when: expectInstanceOf({
            typeName: "BoundaryCondition",
            Type: ArchFacade.BoundaryCondition
        })
    })

    let contractConstraints = expectSome({
        when: expectInstanceOf({
            typeName: "Constraints",
            Type:  ArchFacade.Constraint
        })
    })

    let inputContract = contract({
        description: "Get some mesh with some constraints and a boundary condition",
        requireds: {
            meshes: contractMesh,
            bc: contractBoundaryCondition
        },
        optionals:{
            constraints: contractConstraints
        }
    })

    @Flux({
        pack: pack,
        namespace: ModuleSurface,
        id: "ModuleSurface",
        displayName: "Surface",
        description: "A surface created from mesh, constraints & boundary condition, object",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_surface_module.surface.html`
        }
    })
    @BuilderView({
        namespace: ModuleSurface,
        icon: svgIcon
    })
    export class Module extends ModuleFlux {

        surface$: Pipe<Array<ArchSurface> | ArchSurface>

        constructor(params) {
            super(params)

            this.addInput({
                id:"objects",  
                description: `Triggering this input construct surface(s) for use in Arch computations.`,
                contract: inputContract,
                onTriggered: ({data, configuration, context}) => this.createSurfaces(data, configuration, context)  
            })
            this.surface$ = this.addOutput({id:"surface"})
        }

        createSurfaces(
            {meshes, bc, constraints}: {meshes: Mesh[], bc:  ArchFacade.BoundaryCondition, constraints?: ArchFacade.Constraint[]} , 
            config: PersistentData, 
            context: Context ){
            
            let surfaces = meshes.map(mesh => {
        
                let bufferGeom = mesh.geometry as BufferGeometry
                let indexes = Uint16Array.from(bufferGeom.index.array)
                let positions = Float32Array.from(bufferGeom.attributes.position.array)
                let surface = new ArchFacade.Surface({
                    positions,
                    indexes, 
                    constraints: constraints || [],
                    boundaryCondition:bc
                })
                return surface
            })   
            context.info("Surfaces created", {surfaces} )
            this.surface$.next({data: surfaces.length > 1 ? surfaces : surfaces[0], context})
            context.terminate()
        }
    }
}
