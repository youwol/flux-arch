
import { arch, pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, RenderView, createHTMLElement, Property, freeContract, Context } from '@youwol/flux-core'
import { ArchFacade } from './arch.facades';


export namespace ModuleRemoteAndersonian {
    //Icons made by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path d="M378.24,243.712l-96-80c-4.768-3.968-11.424-4.832-17.024-2.208C259.584,164.128,256,169.792,256,176v48H16    c-8.832,0-16,7.168-16,16v32c0,8.832,7.168,16,16,16h240v48c0,6.208,3.584,11.84,9.216,14.496c2.144,0.992,4.48,1.504,6.784,1.504    c3.68,0,7.328-1.248,10.24-3.712l96-80c3.68-3.04,5.76-7.552,5.76-12.288C384,251.264,381.92,246.752,378.24,243.712z"/>
    <path d="M480,0H32C14.336,0,0,14.336,0,32v160h64V64h384v384H64V320H0v160c0,17.696,14.336,32,32,32h448c17.696,0,32-14.304,32-32    V32C512,14.336,497.696,0,480,0z"/>
    `

    type ArchRemote = any

    @Schema({
        pack
    })
    export class PersistentData {

        @Property({ description: "" })
        readonly HSigma:  number = 0

        @Property({ description: "" })
        readonly hSigma: number = 0

        @Property({ description: "" })
        readonly vSigma: number = 0

        @Property({ description: "" })
        readonly theta: number = 0

        @Property({ description: "emit initial value" })
        readonly emitInitialValue : boolean = true

        constructor(params : {
            HSigma?: number, 
            hSigma?: number, 
            vSigma?: number, 
            theta?: number, 
            emitInitialValue?: boolean
        } = {}) {
            Object.assign(this, params)
        }
    }

    @Flux({
        pack: pack,
        namespace: ModuleRemoteAndersonian,
        id: "RemoteAndersonian",
        displayName: "Andersonian",
        description: "Anderson type of remote",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_remote_andersonian_module.remoteandersonian.html`
        }
    })
    @BuilderView({
        namespace: ModuleRemoteAndersonian,
        icon: svgIcon
    })
    export class Module extends ModuleFlux {

        remote$: Pipe<ArchRemote>

        constructor(params) {
            super(params)

            this.addInput({
                id:"input",  
                description: `Triggering this input construct an Andersonian remote stress field. No data beside configuration is needed.`,
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => this.createRemote(data, configuration, context) 
            })
            this.remote$ = this.addOutput({id:"remote"} )

            let conf = this.getPersistentData<PersistentData>()
            if(conf.emitInitialValue)
                this.createRemote(undefined,conf, new Context("", {}))
        }

        createRemote(_, config: PersistentData, context: Context){
            this.remote$.next({data:new ArchFacade.AndersonianRemote({...config, ...{stress:true}}), context})
        }
    }
}
