import { Interfaces } from '@youwol/flux-files'
import { from, Observable } from 'rxjs'
import { ArchMaterialNode, ArchObservationMeshNode, RootArchNode, 
    ArchDiscontinuityMeshNode, ArchNode, ArchBoundaryConditionNode, 
    ArchConstraintNode, ArchRemoteNode, ArchFolderDiscontinuityNode, ArchFolderObservationNode, ArchFolderRemoteNode, ProcessingType, ArchDiscontinuityNode } from './tree-nodes'
import { ArchFacade } from '../arch.facades'
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
    
    abstract solve(model: ArchFacade.Model, notifications$): 
        Observable<Solution>

    abstract resolve(solution: Solution, projectId: string, meshId: string, meshFileId: string, notifications$): 
        Observable<Interfaces.File>
}

export function newProjectNode(ownerId: string) {

    let folderDiscontinuity = new ArchFolderDiscontinuityNode({id:uuidv4(), ownerId, name:"discontinuities", children:[], type: []})
    let material = new ArchMaterialNode({id:uuidv4(), ownerId, name:"material", parameters:{poisson:0.25, young:1, density:1000}, type: []})
    let folderGrids = new ArchFolderObservationNode({id:uuidv4(), ownerId, name:"grids", type: [], children:[]})
    let folderRemotes = new ArchFolderRemoteNode({id:uuidv4(), ownerId, name:"remotes", type: [], children:[]})
    return new RootArchNode({ id:uuidv4(), ownerId, name:"", type: [], folders:[], children: [folderDiscontinuity, material, folderGrids, folderRemotes] })
}

export function needSolve( commands: Array<ImmutableTree.Command<ArchNode>>){

    let r = commands.reduce( (acc,command) =>{

        if( command instanceof ImmutableTree.AddChildCommand 
            && command.childNode instanceof ArchDiscontinuityMeshNode )
            return true 
        
        if( command instanceof ImmutableTree.AddChildCommand && command.childNode instanceof ArchConstraintNode )
            return true 
            
        if( command instanceof ImmutableTree.AddChildCommand && command.childNode instanceof ArchRemoteNode )
            return true 
        
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArchMaterialNode )
            return true 
 
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArchBoundaryConditionNode )
            return true         
        
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArchConstraintNode )
            return true         
                
        if( command instanceof ImmutableTree.ReplaceAttributesCommand && command.node instanceof ArchRemoteNode )
            return true         
                        
        if( command instanceof ImmutableTree.ReplaceNodeCommand && command.newNode instanceof ArchMaterialNode )
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
        public readonly withCommands: Array<ImmutableTree.Command<ArchNode>> = [],  
        public readonly withComponents: Array<ArchFacade.ArchModelComponent> = [], 
        public readonly node? : RootArchNode,
        public readonly solution?: Solution){
        
        this.solutionChanged = needSolve(withCommands)
        if(this.withCommands.filter(cmd => !(cmd instanceof ImmutableTree.InitCommand) ).length==0 && !node)
            this.node = initial.node
            
        if( initial && !solution && !this.solutionChanged)
            this.solution = initial.solution
    }
}


export class TreeViewState extends  ImmutableTree.State<ArchNode> {

    solve$ : Observable<{count:number}>
    resolve$ : Observable<{count:number, ids:Array<string>}>

    updatePropagationFct = (oldNode) => ({ ownerId: this.id })
    //upload$ : BehaviorSubject<{count:number}>
    
    constructor(public readonly id: string, root: RootArchNode, public readonly environment: Environment, emitUpdate: boolean) {
        super({rootNode:root,emitUpdate})
        
        this.solve$ = this.root$.pipe(
            switchMap( (root: RootArchNode) => root.processes$ )
        ) 
        this.resolve$ = this.root$.pipe(
            mergeMap( (root: RootArchNode) => from(findChildren<ArchObservationMeshNode>(root,ArchObservationMeshNode) )),
            mergeMap( (node:ArchObservationMeshNode) => node.signals$),
            filter( s => s.type && s.type == ProcessingType.Resolve),
            scan( (acc:{count:number, ids:Array<string>},e:{type:string, id: string, count: number}) =>  
                ({count:acc.count+e.count,ids:acc.ids.concat([e.id])}), 
                {count:0, ids:[]} )
        ) 
    }

    addChild(  parent: string | ArchNode, childNode: ArchNode, emitUpdate = true ){
        super.addChild( parent, childNode, emitUpdate, this.updatePropagationFct )
    }

    removeNode( target: string | ArchNode , emitUpdate = true){
        super.removeNode( target, emitUpdate, this.updatePropagationFct )
    }

    replaceNode(target: string | ArchNode, newNode, emitUpdate = true) {
        super.replaceNode( target, newNode, emitUpdate, this.updatePropagationFct )
    }

    replaceAttributes(target: string | ArchNode, newAttributes, emitUpdate = true) {
        super.replaceAttributes( target, newAttributes, emitUpdate, this.updatePropagationFct )
    }

    dropFile(parentNode: ArchNode, filename: string, blob: Blob ){
        let folder = this.environment.folder
        let drive = folder.drive

        drive.createFile(folder.id,filename,blob).subscribe(
            (file: Interfaces.File) => {
                
                if(parentNode instanceof ArchDiscontinuityNode){
                    var reader = new FileReader();
                    reader.addEventListener("loadend",  () => {
                        let df = decodeGocadTS(reader.result as string, { shared: true })
                        let boundingBox = getBoundingBox( df)
                        let node = new ArchDiscontinuityMeshNode({ id:uuidv4(), ownerId:this.id, name: file.name, fileId:file.id, boundingBox })
                        this.addChild(parentNode.id, node) 
                    });
                    reader.readAsText(blob);
                }
            }
        )
    }
}