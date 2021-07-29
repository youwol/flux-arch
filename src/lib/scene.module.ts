
import { arche, pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, freeContract, expectSome, expectAnyOf, expectInstanceOf, expectAllOf, expectSingle, contract, Context } from '@youwol/flux-core'
import { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { buildSurfacesFromThree } from './implementation/arche-builders'
import { ArchFacade } from './arche.facades';

export namespace ModuleScene {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `


    @Schema({
        pack: pack
    })
    export class PersistentData {

        constructor({} = {}) {}
    }

    let contractSurface= expectSome({
        when: expectAnyOf( {
            description:"One surface or an array of surfaces",
            when:[ 
                expectInstanceOf({
                    typeName: "Surface",
                    Type: ArchFacade.Surface,
                    normalizeTo: (d) => [d]
                }),
                expectSome({
                    when: expectInstanceOf({
                        typeName: "Surface",
                        Type: ArchFacade.Surface
                    })
                })
            ]
        }),
        normalizeTo: (d: Array<Array<ArchFacade.Surface>>) => d.flat()
    })

    let contractMaterial = expectSingle({
        when: expectInstanceOf({
            typeName: "Material",
            Type: ArchFacade.Material
        })
    })

    let contractRemotes = expectSome({
        when: expectInstanceOf({
            typeName: "Remotes",
            Type:  ArchFacade.Remote
        })
    })

    let inputContract = contract({
        description: "Get: (i) some surfaces, (ii) a material, and (iii) some remotes",
        requireds: {
            surfaces: contractSurface,
            material: contractMaterial,
            remotes: contractRemotes
        },
        optionals:{}
    })

    @Flux({
        pack: pack,
        namespace: ModuleScene,
        id: "ModuleScene",
        displayName: "Scene",
        description: "A geological scene",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_surface_module.surface.html`
        }
    })
    @BuilderView({
        namespace: ModuleScene,
        icon: svgIcon
    })
    export class Module extends ModuleFlux {

        scene$ : Pipe<ArchFacade.Scene>

        constructor(params) {
            super(params)

            this.addInput({
                id:"objects",  
                description: `Triggering this input construct surface(s) for use in Arch computations.`,
                contract: inputContract,
                onTriggered: ({data, configuration, context}) => this.createSurfaces(data, configuration, context)  
            })
            this.scene$ = this.addOutput({id:"scene"})
        }

        createSurfaces(
            {surfaces, material, remotes}: {
                surfaces: ArchFacade.Surface[], 
                material:  ArchFacade.Material, 
                remotes: ArchFacade.Remote[]
            } , 
            config: PersistentData, 
            context: Context ){
            
            let scene = new ArchFacade.Scene({surfaces, material, remotes})
            this.scene$.next({data: scene, context })

            context.terminate()
        }
    }
}
