
import { pack } from './factory';
import { Property, Flux, BuilderView, Orchestrator, SideEffects, Pipe, RenderView} from '@youwol/flux-lib-core'
import { ReplaySubject, Subscription, Observable, combineLatest } from 'rxjs';
import { filter, map, scan, switchMap, tap } from 'rxjs/operators';
import { ProjectMgr } from './project-mgr.module';
import { Environment, ProjectState } from './implementation/data';
import { ProjectMgrOutput, StateMgr } from './implementation/arche.state';
import { Tree } from '@youwol/flux-lib-views';
import { WorkflowStep } from './workflow-step.plugin';

//Icons made by <a href="https://www.flaticon.com/free-icon/workflow_1271776?term=workflow&page=2&position=11" title="srip">srip</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
let svgIcon = `
<path d="m456 384.101562c0 39.761719-32.234375 72-72 72s-72-32.238281-72-72c0-39.765624 32.234375-72 72-72s72 32.234376 72 72zm0 0"/><path d="m376 234.84375h-17.945312l17.945312 17.945312zm0 0"/><path d="m409.945312 234.84375h-17.945312v17.945312zm0 0"/><path d="m226.742188 54.15625v17.945312h17.945312zm0 0"/><path d="m226.742188 88.101562v17.941407l17.945312-17.941407zm0 0"/><path d="m309.457031 80.101562 74.542969 60.863282 74.542969-60.863282-74.542969-60.867187zm0 0"/><path d="m8 312.101562h144v144h-144zm0 0"/><path d="m80 192.101562-37.257812 37.253907h29.257812v66.746093h16v-66.746093h29.257812zm0 0"/><path d="m152 80.101562c0 39.761719-32.234375 72-72 72s-72-32.238281-72-72c0-39.765624 32.234375-72 72-72s72 32.234376 72 72zm0 0"/><path d="m226.742188 54.15625 17.945312 17.945312h-17.945312v16h17.945312l-17.945312 17.941407v11.3125l37.257812-37.253907-37.257812-37.257812zm0 0"/><path d="m376 252.789062-17.945312-17.945312h-11.3125l37.257812 37.257812 37.257812-37.257812h-11.3125l-17.945312 17.945312v-17.945312h-16zm0 0"/><path d="m376 160.101562h16v74.742188h-16zm0 0"/><path d="m168 72.101562h58.742188v16h-58.742188zm0 0"/>
`

export namespace WorkflowManager {


    export class PersistentData {

        @Property({ description: "id of the manager"})
        readonly id : string

        constructor({id} :{id?:string}= {}) {
            this.id = id != undefined ? id : "WorkflowMgr"
        }
    }

    class WfNode extends Tree.Node{

        name: string

        constructor({id, name, children}){
            super({id, children})
            this.name = name
        }
    }

    class WfRootNode extends WfNode{

        constructor({id, name, children}){
            super({id, name, children})
        }
    }

    class WfStepNode extends WfNode{

        solve$ : Observable<{count:number}>
        resolve$ : Observable<{count:number, ids: Array<string>}>

        constructor({id, name, children, solve$, resolve$}){
            super({id, name, children})
            this.solve$ = solve$
            this.resolve$ = resolve$
        }
    }

    class Link{
        constructor(public readonly id:string, public readonly name:string, public readonly path: Array<string>){}
    }
    class Edge{
        constructor(public readonly fromId:string, public readonly toId:string){}
    }



    @Flux({
        pack:           pack,
        namespace:      WorkflowManager,
        id:             "WorkflowManager",
        displayName:    "WorkflowManager",
        description:    "Manager of arceh workflow"
    })
    @BuilderView({
        namespace:      WorkflowManager,
        icon:           svgIcon
    })
    @RenderView({
        namespace: WorkflowManager,
        render: (mdle) => renderHtmlElement(mdle)
    })
    export class Module extends Orchestrator implements SideEffects {

        // ! we need to work with plugin uid and not plugin.moduleId because @ plugin re-creation same moduleId is used
        // (removeStep happens after registerStep)
        registered : {[key:string]:ProjectMgr.Module} = {}  // plugin uid => ProjectMgr
        names: {[key:string]:string} = {} // plugin uid => step name
        subscriptionPlugin : {[key:string]:Subscription} = {} // plugin uid => Subscription
        projectMgrIds : {[key:string]: string} = {} // uid => ProjectMgr id 
        subscriptions = new Array<Subscription>()

        newLinks$ = new ReplaySubject<Link>()
        links = new Array<Link>()
        tree$ : Observable<Tree.State<WfNode>>
        treeview : Tree.View<WfNode>

        output$ : Pipe<ProjectMgrOutput>
        

        selectedStepId$ =  new ReplaySubject<string>()

        constructor(params){ 
            super( Object.assign({},params,{typeName:'WorkflowManager', id: params.configuration.data.id}) ) 
            this.output$  = this.addOutput("output", {}) 
            this.registerOrchestrator()

            this.tree$ = this.newLinks$.pipe(
                scan( (acc,e)=>{
                    return e.name != undefined 
                    ? acc.filter(prev=> prev.id != e.id).concat(e) 
                    : acc.filter(prev=> prev.id != e.id) 
                }, [] ),
                tap( links => {
                    return this.links = links 
                }),
                map( links => {
                    return this.createEdges(links)
                }),
                map( edges => {
                    let root = this.toTree(edges)
                    return new Tree.State<WfNode>(root)
                })
            )
            this.subscriptions.push(
                combineLatest([this.newLinks$, this.selectedStepId$]).pipe(
                    map( ([link, id]) => {
                        return id
                    }),
                    filter( id => this.registered[id]!=undefined && this.registered[id].lastStateMgr!=undefined),
                    tap( id => {
                        this.registered[id].lastStateMgr.nodesWatched = []
                    }),
                    switchMap( id => {
                        return this.registered[id].output$
                    })
                ).subscribe( (d: {data:ProjectMgrOutput, context:any}) => {
                    this.output$.next(d)
                }) 
            )
        }

        switchTo( plugin:  WorkflowStep.Module | string) {

            plugin instanceof WorkflowStep.Module 
                ? this.selectedStepId$.next(plugin.uid)
                : this.selectedStepId$.next(plugin)
        }

        apply(){ }

        dispose() {
            Object.values(this.subscriptionPlugin).forEach( s => s.unsubscribe())
            this.subscriptions.forEach( s => s.unsubscribe() )
        }
        
        toUid( projectMgrId) {
            let entry = Object.entries(this.projectMgrIds).reverse().find( ([k,v]) => v==projectMgrId)
            if( !entry )
                return undefined            
            return entry[0]
        }

        registerStep(plugin: WorkflowStep.Module){
                 
            let path = (state : ProjectState  ): Array<string> => {
                return state && state.id ? [state.id].concat(path(state.initial)) : ['root']
            }

            this.registered[plugin.uid] = plugin.parentModule
            this.names[plugin.uid] = plugin.parentModule.getConfiguration<ProjectMgr.PersistentData>().projectName
            this.projectMgrIds[plugin.uid] = plugin.parentModule.moduleId

            this.subscriptionPlugin[plugin.uid] = plugin.parentModule.lastStateMgr$.pipe(
                switchMap( (mgr) => mgr.output$),
                tap( (output: ProjectMgrOutput) => this.names[plugin.uid] = output.manager.name ),
                filter( ({state}) => {
                    return this.links.find( link => link.id == this.toUid(state.id)) == undefined 
                }),
                map( ({state}) => new Link(this.toUid(state.id), this.names[plugin.uid], path(state)) ) 
            ).subscribe(
                link => this.newLinks$.next(link)
            )
        }

        removeStep(plugin: WorkflowStep.Module){     

            if(!this.registered[plugin.uid])   
                return  
            delete this.registered[plugin.uid]
            delete this.names[plugin.uid]   
            delete this.projectMgrIds[plugin.uid]                 
            this.subscriptionPlugin[plugin.uid].unsubscribe()
            delete this.subscriptionPlugin[plugin.uid]
            this.newLinks$.next( new Link(plugin.uid, undefined, undefined) )
        }

        toTree(edges: Array<Edge>){
            let root = new WfRootNode({id:"root", name:"root", children:[]})
            let resolved :{[key:string]:WfNode}={'root': root}

            while(edges.length>0){
                let edge = edges.find( edge => resolved[edge.fromId] ) || edges[0]
                let parentNode = resolved[edge.fromId] || root

                let solve$ = this.registered[edge.toId]
                .lastStateMgr$.pipe(switchMap( mgr => mgr.tree.solve$))
                let resolve$ = this.registered[edge.toId]
                .lastStateMgr$.pipe(switchMap( mgr => mgr.tree.resolve$))

                let node = new WfStepNode({ id:edge.toId,  name:this.names[edge.toId],  children:[], solve$, resolve$})
                parentNode.resolvedChildren().push(node)
                edges = edges.filter( e => e!= edge)    
                resolved[edge.toId] = node
            }
            return root
        }

        private createEdges(links: Array<Link>){

            let findParent = (path : Array<string>): string => {
                if( path[0] == 'root' || path[0]=='empty-project')
                    return 'root'
                let projectMgr = this.toUid(path[0]) 
                return  projectMgr ? projectMgr : findParent(path.slice(1))
            }
            return links.map( link => new Edge(findParent(link.path.slice(1)), link.id) )
        }
    }



    function renderHtmlElement( mdle : Module ){

        let actions = (state,node) => []

        let headerView =  (state: Tree.State<WfNode>, node:WfNode) =>{

            if(node instanceof WfRootNode)
                return  { 
                    class: 'd-flex w-100 align-items-baseline wf-root-node',
                    children:{ 
                        text: {tag: 'span', class: 'mx-2 w-100', innerText: node.name } 
                    }
                }
            if(node instanceof WfStepNode)
                return { 
                    class: 'd-flex w-100 align-items-baseline',
                    children:{ 
                        icon: { tag: 'i', class: 'fas fa-step-forward' },
                        text: {tag: 'span', class: 'mx-2 w-100', innerText: node.name },
                        solve : node.solve$.pipe( 
                            map( ({count}) => count > 0 ? { tag: 'i', class: 'fas fa-cog fa-spin yw-color-enabled' } : {})
                        ),
                        resolve : node.resolve$.pipe( 
                            map( ({count}) => count > 0 
                                ? { class:'d-flex align-items-baseline',
                                    children:{
                                        icon:{tag: 'i', class: 'fas fa-sync-alt fa-spin yw-color-enabled' },
                                        text:{tag:'i', innerText:count, style:{'font-size':'x-small'}}
                                    }
                                } : {})
                        )                          
                    }
                }
        }
        mdle.treeview = new Tree.View<WfNode>( mdle.tree$ , {actions, headerView}, mdle.subscriptions)

        mdle.subscriptions.push(
            mdle.treeview.selectedNode$.pipe(
                filter( d => d && d.id != 'root'),
            ).subscribe( d =>{
                mdle.switchTo(d.id)
            })
        )
        return mdle.treeview.render()
    }
}
