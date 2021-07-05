
import { Flux, BuilderView, Schema, PluginFlux, SideEffects, Property, Orchestrator, StaticStorage, uuidv4 } from '@youwol/flux-core'
import { pack } from './main';
import { filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { WorkflowManager } from './workflow-manager.module';
import { ProjectMgr } from './project-mgr.module';

export namespace WorkflowStep {
   
    //Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let icon = `
    <path xmlns="http://www.w3.org/2000/svg" d="m465 81.433594v-21.433594c0-33.085938-26.914062-60-60-60h-345c-33.085938 0-60 26.914062-60 60v352c0 33.085938 26.914062 60 60 60h392c33.085938 0 60-26.914062 60-60v-272c0-28.617188-20.148438-52.609375-47-58.566406zm-40-21.433594v20h-90v-20c0-7.011719-1.21875-13.738281-3.441406-20h73.441406c11.027344 0 20 8.972656 20 20zm-150-20c11.027344 0 20 8.972656 20 20v20h-91v-20c0-7.011719-1.21875-13.738281-3.441406-20zm197 372c0 11.027344-8.972656 20-20 20h-392c-11.027344 0-20-8.972656-20-20v-352c0-11.027344 8.972656-20 20-20h84c11.027344 0 20 8.972656 20 20v60h288c11.027344 0 20 8.972656 20 20zm0 0"/>
    `

    @Schema({
        pack: pack,
        description: "Persistent Data of WorkflowStep"
    })
    export class PersistentData  {
        
        @Property({ description: "manager id"})
        readonly managerId: string

        constructor({ managerId} :{ managerId?:string}= {}) {
            this.managerId = (managerId != undefined) ? managerId  : "WorkflowMgr"
            
        }
    }

    @Flux({
        pack: pack,
        namespace: WorkflowStep,
        id: "WorkflowStep",
        displayName: "WorkflowStep",
        description: "A step of an Arche workflow",
        compatibility: {
            "A step should be associated to a project manager module": (mdle) => mdle instanceof ProjectMgr.Module,
        }
    })
    @BuilderView({
        namespace: WorkflowStep,
        icon: icon
    })
    export class Module extends PluginFlux<ProjectMgr.Module>  implements SideEffects {

        manager : WorkflowManager.Module

        subscriptions = new Array<Subscription>()
        uid : string
        
        constructor(params) { 
            super(params) 

            let staticStore : StaticStorage = params.staticStorage ||  StaticStorage.defaultStorage
            this.uid = this.parentModule.getPersistentData<ProjectMgr.PersistentData>().projectName +"_"+uuidv4()
            let managerId = this.getPersistentData<PersistentData>().managerId;

            this.subscriptions.push(

                Orchestrator.get$<WorkflowManager.Module>('WorkflowManager',staticStore, managerId).pipe(
                    filter( (mgr)=> mgr != this.manager) 
                ).subscribe( (mgr) => {
                    this.manager = mgr
                    this.manager.registerStep(this)
                })
            )
            this.subscriptions.push(
                this.parentModule.output$.pipe(
                    take(1)
                )
                .subscribe( d => {
                    this.parentModule.output$.next(d)
                })
            ) 
            
        }
        
        apply(){
        }

        dispose() {
            if(this.manager)
                this.manager.removeStep(this)
            this.subscriptions.forEach( s => s.unsubscribe())
        }
    }
}