import { ImmutableTree } from '@youwol/fv-tree'
import { Interfaces } from '@youwol/flux-files'
import { filter, map, mergeMap, scan, switchMap, take, tap, withLatestFrom } from 'rxjs/operators'
import * as _ from 'lodash'
import { extractNewObservationMeshNodes, findChild, findChildren} from './utils'
import { ArchFacade } from '../arch.facades'
import { RootArchNode, ArchMeshNode, 
    ArchNode, ArchRealizationNode, ArchDiscontinuityMeshNode, 
    ArchObservationMeshNode, 
    ArchMaterialNode,
    ArchAndersonianRemoteNode,
    ArchFolderRemoteNode} from './tree-nodes'
import { from, Observable, ReplaySubject, Subscription } from 'rxjs'
import { Environment, ProjectState, Solution, needSolve, TreeViewState} from './data'
import { BufferGeometry, Mesh } from 'three'
import { encodeGocadTS } from '@youwol/io'
import { buildModel } from './arch-builders'
import { uuidv4 } from '@youwol/flux-core'
import { Visu3dState } from './visu3d.state'
    

type ComponentNode = ArchFacade.Surface | ArchFacade.Remote | ArchFacade.Material



function toCommand( ownerId: string, root: RootArchNode, component: ArchFacade.ArchModelComponent)
: ImmutableTree.Command<ArchNode>{

    if(component instanceof ArchFacade.Material){
        let oldNode = findChild<ArchMaterialNode>(root,ArchMaterialNode)
        let material = new ArchMaterialNode({id:oldNode.id, ownerId, name:'material', type:['fromComponent'], parameters:component.parameters})
        
        return new ImmutableTree.ReplaceNodeCommand<ArchNode>(oldNode, material) 
    }
    if(component instanceof ArchFacade.AndersonianRemote){
        let remote = new ArchAndersonianRemoteNode({id:uuidv4(),ownerId, name:'Andersonian',type:['fromComponent'], parameters:component.parameters})
        let folder = findChild<ArchFolderRemoteNode>(root,ArchFolderRemoteNode)
        return new ImmutableTree.AddChildCommand<ArchNode>(folder, remote) 
    }

}
function applyCommands( 
    tree: TreeViewState, 
    commands: Array<ImmutableTree.Command<ArchNode>>){
    
    let cmds = commands.filter(cmd => !(cmd instanceof ImmutableTree.InitCommand))
    cmds.forEach( command =>  command.execute(tree, false, tree.updatePropagationFct ) )
    if(cmds.length>0){
        tree.emitUpdate()
    }
}


export class ProjectMgrOutput{
    public readonly environment: Environment
    public readonly manager: StateMgr
    public readonly state: ProjectState
    public readonly selection:{nodes:Array<ArchNode>}
    public readonly context: any

    constructor( {environment, manager, state, selection, context} :
        {environment:Environment, manager: StateMgr, state:ProjectState, selection:{nodes:Array<ArchNode>}, context:any}  ){

            this.environment = environment
            this.manager = manager
            this.state = state
            this.selection = selection
            this.context = context
        }
}


export class StateMgr {
    
    public readonly tree : TreeViewState    
    public readonly output$ : ReplaySubject<ProjectMgrOutput> = new ReplaySubject<ProjectMgrOutput>()
    public readonly inputState : ProjectState
    public readonly solution$ = new ReplaySubject<Solution>()
    public readonly ownedSolution$ = new ReplaySubject<Solution>()
    public readonly subscriptions = new Array<Subscription>()


    public readonly id: string
    public readonly name: string
    public readonly fromState:ProjectState
    public readonly withComponents: Array<ArchFacade.ArchModelComponent>
    public readonly environment: Environment
    public readonly visu3dState : Visu3dState
    public readonly context: Environment

    withCommands = new Array<ImmutableTree.Command<ArchNode>>()
    withCommandComponents = new Array<ImmutableTree.Command<ArchNode>>()
    nodesWatched = new Array<string>()
    lastSolution : {solution: Solution, commandRef: ImmutableTree.Command<ArchNode> }

    constructor(
        {   id, name, fromState, withCommands, withComponents, environment, context}:
        {   id: string, name: string, fromState:ProjectState, withCommands:Array<ImmutableTree.Command<ArchNode>>, 
            withComponents:Array<ArchFacade.ArchModelComponent>, environment:Environment, context: any})  {
                
            this.id = id
            this.name = name
            this.fromState = fromState
            this.withComponents = withComponents
            this.environment = environment
            this.context = context

            this.withCommands = withCommands.slice(0)

            this.inputState = new ProjectState( this.id, fromState, this.withCommands, withComponents)
            let rootNode = this.inputState.node || fromState.node

            this.withCommandComponents = this.withComponents.map( component => {
                return toCommand(this.id, rootNode, component)
            }).filter(d => d )
            let allCommands = [...this.withCommandComponents, ...this.withCommands]

            // In case there are no commands to execute => needEmit = true such that tree.directUpdates
            // will trigger and the initial state will flow out of the module.
            // Otherwise, apply commands will do the job
            let needEmit = allCommands.filter( cmd => !(cmd instanceof ImmutableTree.InitCommand)).length == 0
            this.tree = new TreeViewState(this.id, rootNode, this.environment, needEmit)

            applyCommands(this.tree, allCommands)
            
            this.visu3dState = new Visu3dState(this.name, this.tree, this.environment.drive, this.subscriptions)

            if(this.inputState.solution){
                this.solution$.next(this.inputState.solution)
                this.lastSolution = { solution:this.inputState.solution, commandRef:this.withCommands.slice(-1)[0]}
            }
            
            this.subscriptions.push(

                this.tree.directUpdates$.pipe( 
                    scan( (acc, update) => {
                        let updates = [...acc,...update ]
                        return updates.filter( (update,i)=> i<updates.length-1 ? !(update.command instanceof ImmutableTree.InitCommand) : true)  
                    }, [] ),
                    tap( all =>{
                        this.withCommands = all.map( update => update.command ) 
                        if(this.withCommands.filter( cmd => !(cmd instanceof ImmutableTree.InitCommand)).length>0)
                            console.log("###===> got command "+this.id, this.withCommands)
                    }),
                    map( ( allUpdates: Array<ImmutableTree.Updates<ArchNode>> ) => {

                        let lastUpdate = allUpdates.slice(-1)[0]
                        let solution = undefined
                        let allCommands = this.withCommandComponents.concat(allUpdates.map(u => u.command))
                        if(this.lastSolution){
                            let lastSolutionCmdIndex = allCommands
                            .indexOf(this.lastSolution.commandRef)

                            let inBetweenCmds = allCommands.slice(lastSolutionCmdIndex + 1)
                            if( !needSolve(inBetweenCmds) )
                                solution = this.lastSolution.solution
                        }
                        let state = new ProjectState(  this.id, this.inputState.initial, this.withCommands, this.inputState.withComponents, 
                            lastUpdate.newTree as RootArchNode, solution )

                        return { state, lastUpdate} 
                    })
                ).subscribe( ({state,lastUpdate}) =>{
                    let toUpdates = [...lastUpdate.replacedNodes, ...lastUpdate.addedNodes]
                    .filter( n => this.nodesWatched.find( w => n.id == w ))
                    let uniques = Array.from(new Set(toUpdates))
                    console.log("#### send output ", this.id, {state, lastUpdate:lastUpdate})
                    this.output$.next(new ProjectMgrOutput({
                        environment: this.environment,
                        state,
                        manager:this, 
                        context:this.context,
                        selection:{ nodes: uniques }
                    }))
                })
            )

            this.subscriptions.push(

                this.tree.directUpdates$.pipe( 
                    filter( (updates: Array<ImmutableTree.Updates<ArchNode>>) => {
                        let disc = findChild<ArchDiscontinuityMeshNode>( updates.slice(-1)[0].newTree, ArchDiscontinuityMeshNode)
                        return disc && needSolve(updates.map( update => update.command ))
                    }),
                    switchMap( (updates) => {
                        let lastUpdate = updates.slice(-1)[0]
                        let model$ = buildModel(lastUpdate.newTree as RootArchNode, this.tree.environment.drive)
                        return model$.pipe(map( model=>({model,lastUpdate})))
                    }),
                    switchMap( ({model, lastUpdate} : {model:ArchFacade.Model, lastUpdate:ImmutableTree.Updates<ArchNode>}) => {

                        return this.tree.environment
                        .solve(model, (lastUpdate.newTree as RootArchNode).process$)
                        .pipe( map( (solution) => ({solution, lastUpdate})) )
                    }),
                    tap( ({solution, lastUpdate} : {solution:Solution, lastUpdate:ImmutableTree.Updates<ArchNode>}) => {
                        this.lastSolution = { solution, commandRef: lastUpdate.command} 
                    }),
                    map( ({solution})=>solution)
                )
                .subscribe( solution => {
                    this.ownedSolution$.next(solution)
                    this.solution$.next(solution)
                })
            )

            this.subscriptions.push(

                this.solution$.pipe(
                    withLatestFrom( this.output$ ),
                    filter( ([ solution, {state}] ) => state.solution != solution )
                )
                .subscribe( ([ solution, {state}] : [  Solution, { state: ProjectState} ]) =>{
                    
                    let s = new ProjectState(  this.id, state.initial, state.withCommands, state.withComponents, 
                        state.node, solution )

                    console.log("#### send output with solution", this.id)
                    this.output$.next(new ProjectMgrOutput({
                        environment: this.tree.environment,
                        state: s,
                        manager:this, 
                        selection:{ nodes: []},
                        context:this.context,
                    }))
                })
            )

            let plugResolution = ( obs$: Observable<{solution, nodes}>) => {

                this.subscriptions.push(

                    obs$.pipe(
                        switchMap( ({solution, nodes}:{solution:Solution, nodes:Array<ArchObservationMeshNode>}) => {
                            return from(nodes).pipe( map(node=> ({node,solution})))
                        }),
                        mergeMap( ({solution,node}) => {
                            let realizationFile$ = this.tree.environment.resolve(solution, this.tree.id, node.id, node.fileId, node.signals$)
                            return realizationFile$.pipe( map( file => ({file, oldMeshNode:node, solutionId: solution.solutionId })))
                        })
                    )
                    .subscribe(({file, oldMeshNode, solutionId}: 
                        {file: Interfaces.File, oldMeshNode:ArchObservationMeshNode, solutionId:string}) => {

                        let realization = new ArchRealizationNode({id:"realization-"+oldMeshNode.id, solutionId, ownerId: this.tree.id, name:"realization",fileId:file.id,meshFileId:oldMeshNode.fileId})
                        let meshNode = new oldMeshNode.factory( { ...oldMeshNode, ...{ownerId:this.id, children:[realization]} })
                        this.tree.replaceNode(oldMeshNode, meshNode )
                    }) 
                )
            }
            
            let toResolve1$ = this.ownedSolution$.pipe(
                withLatestFrom( this.tree.root$),
                filter( ([solution, root] : [Solution, RootArchNode]) => {
                    return  findChildren<ArchObservationMeshNode>(root,ArchObservationMeshNode).length>0
                }),
                map( ([solution, root] : [Solution, RootArchNode]) => {
                    let id = this.id
                    let nodes = findChildren<ArchObservationMeshNode>(root,ArchObservationMeshNode)
                    return {solution, nodes}
                })
            )
            let toResolve2$ = this.tree.directUpdates$.pipe(
                withLatestFrom( this.solution$ ),
                filter( ([updates, solution])=> {
                    return  extractNewObservationMeshNodes(this.id, solution.solutionId, updates).length>0
                }),
                map( ([updates, solution]) => {
                    let id = this.id
                    let nodes = extractNewObservationMeshNodes(this.id, solution.solutionId, updates)
                    return {solution, nodes}
                })
            )
            plugResolution(toResolve1$)
            plugResolution(toResolve2$)
    }

    dispose() {
        this.subscriptions.forEach( s => s.unsubscribe())
    }


    saveNode( node: ArchNode, 
        data: ArchFacade.Constraint | ArchFacade.AndersonianRemote | ArchFacade.BoundaryCondition | ArchFacade.Material ){
        this.tree.replaceAttributes(node.id, {parameters: data.parameters})
    }    

    saveMesh( file: Interfaces.File, mesh: Mesh ){
        
        let geom = mesh.geometry as BufferGeometry
        let s = encodeGocadTS([]/*{
            mng: undefined,
            positions: Array.from(geom.attributes.position.array),
            indices: Array.from(geom.index.array)
        }*/)
        this.tree.environment.drive.updateContent(file.id, new Blob([s])).pipe(
            mergeMap( () => this.tree.root$ ),
            take(1)
        ).subscribe( (root) => {
            let nodes = findChildren<ArchMeshNode>( root, ArchMeshNode)
            let node = nodes.find( node => node.fileId == file.id)
            this.visu3dState.revokeFrom(node)
            this.tree.replaceAttributes(node.id, {fileId:file.id, children:[]})
        })            
    }

    buildObject3D( nodeId ) : Observable<Mesh>{
        return this.visu3dState.buildObject(nodeId)
    }

    addSelectionWatch(node:ArchNode) {
        if(this.nodesWatched.find( id => id == node.id) == undefined)
            this.nodesWatched.push(node.id)
    }

    removeSelectionWatch(node:ArchNode) {
        this.nodesWatched = this.nodesWatched.filter( id => id!=node.id)
    }
}
