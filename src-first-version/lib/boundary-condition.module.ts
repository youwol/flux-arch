
import { arche, pack } from './factory';
import { Flux, BuilderView, ModuleFlow, Pipe, Schema, RenderView, createHTMLElement, Property } from '@youwol/flux-lib-core'
import { ArcheFacade } from './arche.facades';


export namespace BoundaryCondition {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `

    type ArcheRemote = any


    @Schema({
        pack: pack,
        description: "Axis BC"
    })
    class AxisBC{

        @Property({ description: "", enum:['free','fixed'] })
        readonly type: string

        @Property({ description: "" })
        readonly value: number

        constructor( { type, value} :{ type?:string, value?:number } = {}
            ) {
              this.type = type != undefined ? type : 'free'
              this.value = value != undefined ? value : 0
            }
    }

    @Schema({
        pack: pack,
        description: "Persistent Data of SurfaceBuilder"
    })
    export class PersistentData {

        @Property({ description: "" })
        readonly dipAxis: AxisBC

        @Property({ description: "" })
        readonly strikeAxis: AxisBC

        @Property({ description: "" })
        readonly normalAxis: AxisBC

        @Property({ description: "emit initial value" })
        readonly emitInitialValue : boolean

        constructor(
            { dipAxis, strikeAxis, normalAxis, emitInitialValue} :{ dipAxis?, strikeAxis?, normalAxis?,emitInitialValue?:boolean }= {}) {

            this.dipAxis = new AxisBC( dipAxis != undefined ? dipAxis : {}) 
            this.strikeAxis = new AxisBC( strikeAxis != undefined ? strikeAxis : {}) 
            this.normalAxis = new AxisBC( normalAxis != undefined ? normalAxis : {}) 
            this.emitInitialValue = emitInitialValue != undefined ? emitInitialValue : true
        }
    }

    @Flux({
        pack: pack,
        namespace: BoundaryCondition,
        id: "BoundaryCondition",
        displayName: "BoundaryCondition",
        description: "Anderson type of remote"
    })
    @BuilderView({
        namespace: BoundaryCondition,
        icon: svgIcon
    })
    export class Module extends ModuleFlow {

        boundaryCondition$: Pipe<ArcheRemote>

        constructor(params) {
            super(params)

            this.addInput("input",  inputDescription, this.createBoundaryCondition )
            this.boundaryCondition$ = this.addOutput("boundary-condition", {})

            let conf = this.getConfiguration<PersistentData>()
            if(conf.emitInitialValue)
                this.createBoundaryCondition(undefined,conf, {})
        }

        createBoundaryCondition(_, config: PersistentData, context: any){
            this.boundaryCondition$.next({data:new ArcheFacade.BoundaryCondition(config), context})
        }
    }

    let inputDescription = {
        description: `Triggerring this input construct a boundary condition to link to a surface. No data beside configuration is needed.`,
        mandatory: {}
    } 
}

