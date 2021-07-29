
import { arche, pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, RenderView, createHTMLElement, Property, freeContract, Context } from '@youwol/flux-core'
import { ArcheFacade } from './arche.facades';


export namespace ModuleBoundaryCondition {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `

    type ArcheRemote = any


    @Schema({
        pack: pack
    })
    class AxisBC{

        @Property({ 
            description: "", 
            enum:['free','fixed'] 
        })
        readonly type: string = 'free'

        @Property({ 
            description: "Boundary condition function",
            type: 'code'
        })
        readonly field: string | ((x,y,z)=> number) = "return (x,y,z) => 0"

        constructor( params :{ 
            type?:string, 
            field?:string | ((x,y,z)=> number)
        } = {}
            ) {
                Object.assign(this, params)
            }
    }

    @Schema({
        pack: pack,
    })
    export class PersistentData {

        @Property({ description: "" })
        readonly dipAxis: AxisBC = new AxisBC({type:'free', field: "return (x,y,z) => 0"})

        @Property({ description: "" })
        readonly strikeAxis: AxisBC = new AxisBC({type:'free', field: "return (x,y,z) => 0"})

        @Property({ description: "" })
        readonly normalAxis: AxisBC = new AxisBC({type:'free', field: "return (x,y,z) => 0"})

        @Property({ description: "emit initial value" })
        readonly emitInitialValue : boolean = true

        constructor( {dipAxis, strikeAxis, normalAxis, emitInitialValue} : { 
            dipAxis?: AxisBC, 
            strikeAxis?: AxisBC, 
            normalAxis?: AxisBC,
            emitInitialValue?:boolean 
        } = {}) {

            if(emitInitialValue)
                this.emitInitialValue = emitInitialValue
            if(dipAxis)
                this.dipAxis = new AxisBC(dipAxis) 
            if(strikeAxis)
                this.dipAxis = new AxisBC(strikeAxis) 
            if(normalAxis)
                this.dipAxis = new AxisBC(normalAxis)
        }
    }

    @Flux({
        pack: pack,
        namespace: ModuleBoundaryCondition,
        id: "ModuleBoundaryCondition",
        displayName: "Boundary",
        description: "",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_boundary_condition_module.boundarycondition.html`
        }
    })
    @BuilderView({
        namespace: ModuleBoundaryCondition,
        icon: svgIcon
    })
    export class Module extends ModuleFlux {

        boundaryCondition$: Pipe<ArcheRemote>

        constructor(params) {
            super(params)

            this.addInput({
                id:"input", 
                description: `Triggering this input construct a boundary condition to link to a surface. No data beside configuration is needed.`, 
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => this.createBoundaryCondition(data,configuration, context) 
            })
            this.boundaryCondition$ = this.addOutput({id:"boundary-condition"})

            let conf = this.getPersistentData<PersistentData>()
            if(conf.emitInitialValue){
                let context = new Context(
                    "Initial run",
                    {},
                    this.logChannels 
                )
                this.addJournal({
                    title: `Initial boundary condition from static configuration`,
                    abstract: `Boundary condition created at construction as emitInitialValue is true`,
                    entryPoint: context
                })

                this.createBoundaryCondition(undefined,conf, context) 
            }
        }

        createBoundaryCondition(_, config: PersistentData, context: Context){

            this.boundaryCondition$.next({data:new ArcheFacade.BoundaryCondition(config), context})
            context.terminate()
        }
    } 
}

