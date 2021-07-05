import { Interfaces } from '@youwol/flux-files'
import { from, Observable } from 'rxjs'
import { ArcheMaterialNode, ArcheObservationMeshNode, RootArcheNode, 
    ArcheDiscontinuityMeshNode, ArcheNode, ArcheBoundaryConditionNode, 
    ArcheConstraintNode, ArcheRemoteNode, ArcheFolderDiscontinuityNode, ArcheFolderObservationNode, ArcheFolderRemoteNode, ProcessingType, ArcheDiscontinuityNode } from './tree-nodes'
import { ArcheFacade } from '../arche.facades'
import * as _ from 'lodash'
import { ImmutableTree } from '@youwol/fv-tree'
import { uuidv4 } from '@youwol/flux-core'
import { filter, mergeMap, scan, switchMap } from 'rxjs/operators'
import { findChildren, getBoundingBox } from './utils'
import { decodeGocadTS} from'@youwol/io'

export interface Solution{

    readonly solutionId: string
}

export abstract class Environment{

    readonly drive: Interfaces.Drive
    readonly folder: Interfaces.Folder
    
    abstract solve(model: ArcheFacade.Model, notifications$): 
        Observable<Solution>

    abstract resolve(solution: Solution, projectId: string, meshId: string, meshFileId: string, notifications$): 
        Observable<Interfaces.File>
}

export function newProjectNode(ownerId: string) {

    let folderDiscontinuity = new ArcheFolderDiscontinuityNode({id:uuidv4(), ownerId, name:"discontinuities", children:[], type: []})
    let material = new ArcheMaterialNode({id:uuidv4(), ownerId, name:"material", parameters:{poisson:0.25, young:1, density:1000}, type: []})
    let folderGrids = new ArcheFolderObservationNode({id:uuidv4(), ownerId, name:"grids", type: [], children:[]})
    let folderRemotes = new ArcheFolderRemoteNode({id:uuidv4(), ownerId, name:"remotes", type: [], children:[]})
    return new RootArcheNode({ id:uuidv4(), ownerId, name:"", type: [], folders:[], children: [folderDiscontinuity, material, folderGrids, folderRemotes] })
}

export function needSolve( commands: Array<ImmutableTree.Command<ArcheNode>>){

    let r = commands.reduce( (acc,command) =>{

        if( command instanceof ImmutableTree.AddChildCommand 
            && command.childNode instanceof ArcheDiscontinuityMeshNode )
            return true 
        
        if( command instanceof ImmutableTree.AddChildCommand && command.childNode instanceof ArcheConstraintNode )
            return true 
            
        if( command instanceof ImmutableTree.AddChildCommand && command.childNode instanceof ArcheRemoteNode )
            return true 
        
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArcheMaterialNode )
            return true 
 
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArcheBoundaryConditionNode )
            return true         
        
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArcheConstraintNode )
            return true         
                
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArcheRemoteNode )
            return true         
                        
        if( command instanceof ImmutableTree.ReplaceNodeCommand && command.newNode instanceof ArcheMaterialNode )
            return true         
                        
        return acc
    }, false )

    return r
}

export class ProjectState{

    public readonly solutionChanged
    constructor(  
        public readonly id: string, 
        public readonly initial: ProjectState, 
        public readonly withCommands: Array<ImmutableTree.Command<ArcheNode>> = [],  
        public readonly withComponents: Array<ArcheFacade.ArcheModelComponent> = [], 
        public readonly node? : RootArcheNode,
        public readonly solution?: Solution){
        
        this.solutionChanged = needSolve(withCommands)
        if(this.withCommands.filter(cmd => !(cmd instanceof ImmutableTree.InitCommand) ).length==0 && !node)
            this.node = initial.node
            
        if( initial && !solution && !this.solutionChanged)
            this.solution = initial.solution
    }
}


export class TreeViewState extends  ImmutableTree.State<ArcheNode> {

    solve$ : Observable<{count:number}>
    resolve$ : Observable<{count:number, ids:Array<string>}>

    updatePropagationFct = (oldNode) => ({ ownerId: this.id })
    //upload$ : BehaviorSubject<{count:number}>
    
    constructor(public readonly id: string, root: RootArcheNode, public readonly environment: Environment, emitUpdate: boolean) {
        super({rootNode:root,emitUpdate})
        
        this.solve$ = this.root$.pipe(
            switchMap( (root: RootArcheNode) => root.processes$ )
        ) 
        this.resolve$ = this.root$.pipe(
            mergeMap( (root: RootArcheNode) => from(findChildren<ArcheObservationMeshNode>(root,ArcheObservationMeshNode) )),
            mergeMap( (node:ArcheObservationMeshNode) => node.signals$),
            filter( s => s.type && s.type == ProcessingType.Resolve),
            scan( (acc:{count:number, ids:Array<string>},e:{type:string, id: string, count: number}) =>  
                ({count:acc.count+e.count,ids:acc.ids.concat([e.id])}), 
                {count:0, ids:[]} )
        ) 
    }

    addChild(  parent: string | ArcheNode, childNode: ArcheNode, emitUpdate = true ){
        super.addChild( parent, childNode, emitUpdate, this.updatePropagationFct )
    }

    removeNode( target: string | ArcheNode , emitUpdate = true){
        super.removeNode( target, emitUpdate, this.updatePropagationFct )
    }

    replaceNode(target: string | ArcheNode, newNode, emitUpdate = true) {
        super.replaceNode( target, newNode, emitUpdate, this.updatePropagationFct )
    }

    replaceAttributes(target: string | ArcheNode, newAttributes, emitUpdate = true) {
        super.replaceAttributes( target, newAttributes, emitUpdate, this.updatePropagationFct )
    }

    dropFile(parentNode: ArcheNode, filename: string, blob: Blob ){
        let folder = this.environment.folder
        let drive = folder.drive

        drive.createFile(folder.id,filename,blob).subscribe(
            (file: Interfaces.File) => {
                
                if(parentNode instanceof ArcheDiscontinuityNode){
                    var reader = new FileReader();
                    reader.addEventListener("loadend",  () => {
                        let df = decodeGocadTS(reader.result as string, { shared: true })
                        let boundingBox = getBoundingBox( df)
                        let node = new ArcheDiscontinuityMeshNode({ id:uuidv4(), ownerId:this.id, name: file.name, fileId:file.id, boundingBox })
                        this.addChild(parentNode.id, node) 
                    });
                    reader.readAsText(blob);
                }
            }
        )
    }
}