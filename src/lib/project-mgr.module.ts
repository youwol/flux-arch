
import { pack } from './main';
import { Property, Flux, BuilderView, ModuleFlux, Pipe, Schema, SideEffects, Project, freeContract } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, ReplaySubject, Subject, Subscription } from 'rxjs';
import { ArchNode} from './implementation/tree-nodes';
import { ProjectMgrOutput, StateMgr } from './implementation/arche.state';
import { Environment, newProjectNode, ProjectState } from './implementation/data';
import { ArchFacade } from './arche.facades';


export namespace ProjectMgr {
    //Icons made by <a href="https://www.flaticon.com/authors/kiranshastry" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path xmlns="http://www.w3.org/2000/svg" d="m7 309h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-45v-18h128v18h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-18h128v18h-45c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h39v13h-62.867188c-3.953124.144531-7.097656 3.375-7.132812 7.332031v31.667969h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-25h126v25h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-31.667969c-.066406-3.96875-3.230469-7.191406-7.199219-7.332031h-62.800781v-13h35c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-29v-25c-.160156-3.929688-3.410156-7.027344-7.34375-7h-134.65625v-19h37c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-88c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h37v19h-134.675781c-3.929688-.023438-7.171875 3.074219-7.324219 7v25h-29c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7zm264.917969 158h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-37c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7zm140 83h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-37c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7zm-72.019531-98h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-37c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7zm-134.125 83h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm-41.566407-217h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 37c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm41.566407 97c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm-175.691407 0h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 0"/>
    `

    @Schema({
        pack: pack,
        description: "Persistent Data of ProjectMgr"
    })
    export class PersistentData {

        @Property({ description: "display name of the project" })
        readonly projectName: string


        constructor({ projectName }: { projectName?: string } = {}) {
            this.projectName = projectName!=undefined ? projectName : "new project"
        }
    }
    function retrieveEnvironment(prevProjectOutput: ProjectMgrOutput, data : any): any {
        if(prevProjectOutput)
            return prevProjectOutput.environment
        if(data instanceof Environment)
            return data
        if(data.environment instanceof Environment)
            return data.environment
        if( Array.isArray(data) && data.find( d => d.environment )  )
            return data.find( d => d.environment ).environment 
        
    }

    function retrieveInputData(ownerId: string, data : any): any {

        let prevProjectOutput : ProjectMgrOutput = Array.isArray(data)
            ? data.find( d=> d instanceof ProjectMgrOutput )
            : data instanceof ProjectMgrOutput ? data : undefined

        let fromState = prevProjectOutput 
            ? prevProjectOutput.state
            : new ProjectState('empty-project', undefined,[],[], newProjectNode(ownerId),undefined)

        let environment = retrieveEnvironment(prevProjectOutput, data)
        if(!environment)
            throw Error("Can not retrieve environment")
        
        if(!Array.isArray(data))
            return {environment, fromState, withComponents:[]}  

        let withComponents = data.filter( d => {
            if(d instanceof ArchFacade.ArchModelComponent)
                return [d]
            if(Array.isArray(d))
                return d.filter( e => e instanceof ArchFacade.ArchModelComponent) 
        })
        .reduce( (acc,e) => acc.concat(e) , [])
    
        return {environment, fromState, withComponents}  
    }

    @Flux({
        pack: pack,
        namespace: ProjectMgr,
        id: "ProjectMgr",
        displayName: "ProjectMgr",
        description: "An ProjectMgr"
    })
    @BuilderView({
        namespace: ProjectMgr,
        icon: svgIcon
    })
    export class Module extends ModuleFlux implements SideEffects {

        output$ : Pipe<{ environment: Environment, state: ProjectState, manager: StateMgr, selection }>

        lastStateMgr : StateMgr
        lastStateMgr$ = new ReplaySubject<StateMgr>(1)

        nodesWatched = new Array<string>()
        selection$ = new BehaviorSubject<{ nodes: Array<ArchNode>}>({nodes:[]})

        subscriptions = new Array<Subscription>()

        constructor(params) {
            super(params)

            this.output$  = this.addOutput({ id:"output"})     

            this.addInput({
                id:"inputState", 
                description: '',
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => this.newSession(data,configuration,context) 
            }) 
        }

        apply(){}

        dispose(){
            this.subscriptions.forEach( s => s.unsubscribe())
            this.subscriptions=[]
            this.lastStateMgr.dispose()
        }

        newSession(data, configuration: PersistentData, context){
            
            let {environment, fromState, withComponents} = retrieveInputData(this.moduleId,data)

            let withCommands = this.lastStateMgr ? this.lastStateMgr.withCommands : []

            this.lastStateMgr && this.lastStateMgr.dispose()
            
            let stateMgr = new StateMgr( { id: this.moduleId,  name:  configuration.projectName, 
                fromState, withCommands, withComponents, environment, context} )

            let sub = stateMgr.output$.subscribe( (output: ProjectMgrOutput) => {

                this.output$.next( { data: output, context: output.context }) 
            })
            this.subscriptions.push(sub)  
            this.lastStateMgr = stateMgr
            this.lastStateMgr$.next(stateMgr)  
        }   
    }
}
