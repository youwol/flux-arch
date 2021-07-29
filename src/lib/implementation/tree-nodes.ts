import { uuidv4 } from '@youwol/flux-core'
import { ImmutableTree } from '@youwol/fv-tree'
import { DataFrame } from '@youwol/dataframe'
import { Interfaces } from '@youwol/flux-files'

import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs'
import { filter, scan } from 'rxjs/operators'
import { ArchFacade } from '../arche.facades'
import { arche } from '../main'
import { KeplerMesh } from '@youwol/flux-kepler'

export enum ProcessingType {
    Solve,
    Resolve
}


export class ArchNode extends ImmutableTree.Node {

    nodeType = "ArchNode"
    signals$ = new ReplaySubject<any>()
    name: string
    
    type: Array<string>
    ownerId : string

    constructor( { id, ownerId, name, type, children} : 
                 {id?:string, ownerId: string, name:string, type:Array<string>, children?:Array<ArchNode>}){
        super({id:id ? id :uuidv4(), children})
        this.name = name
        this.type = type || []
        this.ownerId = ownerId
    }
    
    /*data(){
        let children = this.children as Array<ArchNode>
        return {id: this.id, ownerId:this.ownerId, name:this.name, type:this.type, children: this.children ? children.map( c => c.data()): undefined,
                nodeType:this.nodeType}
    }*/
}

export class RootArchNode extends ArchNode{

    nodeType = "RootArchNode"

    folders : Object
    process$ = new BehaviorSubject<{type,count}>({type:'none',count:0})
    processes$ : Observable<{count:number}>

    constructor( { id, ownerId, name, type, children, folders, parameters } :
        { id: string, ownerId: string, name: string, type: Array<string>, children: Array<ArchNode>, folders: any, 
            parameters?:  { poisson: number, young: number, density: number } } ){

        super({ id, ownerId, name, type, children})
        this.processes$ = this.process$.pipe( 
            //filter( s => s.type && s.type == ProcessingType.Solve),
            scan( (acc:{count:number},e:{type:string, count: number}) =>  ({count:acc.count+e.count}), {count:0} )
        )
        this.folders = folders
    }

    /*data(){
        return Object.assign({}, super.data(), {folders: this.folders})
    }*/
}


export class ArchMaterialNode extends ArchNode{

    nodeType = "ArchMaterialNode"
    parameters = { poisson: 0, young: 0, density: 0 }

    constructor( { id, ownerId, name, type, parameters } :
        { id: string, ownerId: string, name: string, type: Array<string>,
            parameters?:  { poisson: number, young: number, density: number } } ){

        super({  id, ownerId, name, type, children:undefined})
        this.parameters = parameters || this.parameters
    }

    /*data(){
        return Object.assign({}, super.data(), {parameters:this.parameters})
    }*/
}

export class ArchFolderNode extends ArchNode {

    nodeType = "ArchFolderNode"

    constructor( { id, ownerId, name, type, children} ){ super({  id, ownerId, name, type, children})}
}

export class ArchFileNode extends ArchNode {

    nodeType = "ArchFileNode"
    fileId : string

    constructor( { id, ownerId, name, type, fileId, children} ){ 
        super({ id, ownerId, name, type, children})
        this.fileId = fileId
    }
    /*data(){
        return Object.assign({}, super.data(), {fileId: this.fileId})
    }*/
}
export class ArchFolderDiscontinuityNode extends ArchFolderNode {

    nodeType = "ArchFolderDiscontinuityNode"
    
    constructor( { id, ownerId, name, type, children} ){ super({ id, ownerId, name, type, children}) }
}

export class ArchDiscontinuityNode extends ArchFolderNode {

    nodeType = "ArchDiscontinuityNode"
    fileId : string
    
    constructor( { id, ownerId, name, type, children} ){ super({ id, ownerId, name, type, children})}
}

export class ArchMeshNode extends ArchFileNode {

    nodeType = "ArchMeshNode"
    fileId : string
    
    boundingBox: {min:{x,y,z}, max:{x,y,z}} 

    constructor( { id, ownerId, name, fileId, boundingBox, children} : {id:string, ownerId: string,name:string, fileId:string, children
    boundingBox:{min:{x,y,z}, max:{x,y,z}} }){ 
        super({ id, ownerId, name, type:["mesh"], fileId, children})
        this.boundingBox = boundingBox
    }
    /*data(){
        return Object.assign({}, super.data(), {boundingBox: this.boundingBox})
    }*/
}

export class ArchDiscontinuityMeshNode extends ArchMeshNode{

    nodeType = "ArchDiscontinuityMeshNode"

    constructor( { id, ownerId, name, fileId, boundingBox} : {id:string, ownerId: string,name:string, fileId:string, 
            boundingBox:{min:{x,y,z}, max:{x,y,z}} }){ 
        super({ id, ownerId, name, fileId, boundingBox , children:undefined})
        this.boundingBox = boundingBox
    }
}

export class ArchObservationMeshNode extends ArchMeshNode{

    nodeType = "ArchObservationMeshNode"
    processes$ : Observable<{count:number, ids: Array<string>}>

    constructor( { id, ownerId, name, fileId, boundingBox, children} : {id:string, ownerId: string,name:string, fileId:string, children?: Array<ArchRealizationNode>,
            boundingBox:{min:{x,y,z}, max:{x,y,z}} }){ 
        super({ id, ownerId, name, fileId, boundingBox, children : children || [] })
        this.boundingBox = boundingBox
        
        this.processes$ = this.signals$.pipe( 
            filter( s => s.type && s.type == ProcessingType.Resolve),
            scan( (acc:{count:number, ids:Array<string>},e:{type:string, id: string, count: number}) =>  
                ({count:acc.count+e.count,ids:acc.ids.concat([e.id])}), 
                {count:0, ids:[]} )
        )
    }
}

type Field = string | ((x,y,z)=>number)

export class ArchBoundaryConditionNode extends ArchNode {

    nodeType = "ArchBoundaryConditionNode"

    parameters : { dipAxis: { type:string, field: Field}, 
                   strikeAxis:  { type:string, field: Field}, 
                   normalAxis:  { type:string, field: Field} }

    constructor( { id, ownerId, name, parameters} : 
        { id: string, ownerId: string, name: string, parameters?: { 
            dipAxis: { type:string, field: Field}, 
            strikeAxis:  { type:string, field: Field},
            normalAxis:  { type:string, field: Field} }} ){ 
        super({ id, ownerId, name, type:['boundary-condition'], children:undefined})
        
        this.parameters = parameters || { 
            dipAxis: { type:'locked', field: (x,y,z) => 0}, 
            strikeAxis:  { type:'locked', field: (x,y,z) => 0}, 
            normalAxis:  { type:'locked', field: (x,y,z) => 0} 
        }
    }
    /*data(){
        return Object.assign({}, super.data(), {parameters:this.parameters})
    }*/
}

export class ArchFolderObservationNode extends ArchFolderNode {

    nodeType = "ArchFolderObservationNode"
    
    constructor( { id, ownerId, name, type, children} ){ super({ id, ownerId, name, type, children}) }
}

export class ArchObservationNode extends ArchNode {

    nodeType = "ArchObservationNode"

    constructor( { id, ownerId, name, type, children} ){ 
        super({ id, ownerId, name, type, children})
    }
}

export class ArchPlaneObservationNode extends ArchObservationNode {

    nodeType = "ArchPlaneObservationNode"
    constructor( { id, ownerId, name, type, children} ){ super({ id, ownerId, name, type, children})}
}

export class ArchFolderRemoteNode extends ArchFolderNode {

    nodeType = "ArchFolderRemoteNode"
    
    constructor( { id, ownerId, name, type, children} ){ super({ id, ownerId, name, type, children}) }
}

export abstract class ArchRemoteNode extends ArchNode {

    nodeType = "ArchRemoteNode"

    parameters : any

    constructor( { id, ownerId, name, type, parameters} ){ super({ id, ownerId, name, type})
        this.parameters = parameters
    }

    /*data(){
        return Object.assign({}, super.data(), {parameters:this.parameters})
    }*/
}

export class ArchAndersonianRemoteNode extends ArchRemoteNode {

    nodeType = "ArchAndersonianRemoteNode"
    ArchFacade = ArchFacade.AndersonianRemote

    constructor( { id, ownerId, name, type, parameters} :
        {id: string, ownerId: string, name: string, type?: Array<string>,
         parameters?: {HSigma: number, hSigma: number, vSigma: number, theta: number} }
         ){ super({ id, ownerId, name, type: type, parameters: parameters || {HSigma: 0, hSigma: 0, vSigma: 0, theta: 0}})
    }
}

export abstract class ArchConstraintNode extends ArchNode {

    nodeType = "ArchConstraintNode"
    public readonly parameters : {[key:string]: any}

    constructor( { id, ownerId, name, parameters } ){ 
        super({  id, ownerId, name, type:['constraint'], children:undefined})
        this.parameters = parameters }

    /*data(){
        return Object.assign({}, super.data(), {parameters:this.parameters})
    }*/

}

export class ArchCoulombConstraintNode extends ArchConstraintNode {

    nodeType = "ArchCoulombConstraintNode"
    ArchFacade = ArchFacade.CoulombConstraint
    
    constructor( {  id, ownerId, name, parameters } : { id: string, ownerId: string, name:string, 
        parameters?:{friction: number, cohesion: number}}){ 
        super({ id, ownerId, name, parameters:parameters||{friction: 0, cohesion: 0}})
    }
}

export class ArchCoulombOrthoConstraintNode extends ArchConstraintNode {

    nodeType = "ArchCoulombOrthoConstraintNode"    
    ArchFacade = ArchFacade.CoulombOrthoConstraint

    constructor( { id, ownerId, name, parameters } : { id:string, ownerId: string,name:string,
        parameters?:{theta:number,frictionDip: number,frictionStrike: number/*, cohesionDip: number, 
        cohesionStrike:number, lambda:number , stick:boolean*/}}){ 
        super({ id, ownerId, name, parameters:parameters||{theta:0,frictionDip: 0,frictionStrike: 0/*, cohesionDip: 0, cohesionStrike:0, lambda:0 , stick:true*/}})
    }
}

export class ArchRealizationNode  extends ArchFileNode {

    nodeType = "ArchRealizationNode"
    meshFileId: string
    solutionId: string

    keplerObject: KeplerMesh

    constructor( 
        {  id, ownerId, name, fileId , meshFileId, solutionId} :
        { id:string, ownerId: string, name:string, fileId:string, meshFileId: string, solutionId: string}){ 
        super({ id, ownerId, name, fileId, type:'dataframe', children:undefined})
        this.meshFileId = meshFileId
        this.solutionId = solutionId
    }
    /*data(){
        return Object.assign({}, super.data(), {meshFileId:this.meshFileId, solutionId:this.solutionId})
    }*/
}


/*
export function parseProject(data:any) {

    let base = { 
        name: data.name,
        type: data.type,
        id: data.id,
        ownerId: data.ownerId,
        children: data.children ? data.children.map( child => parseProject(child)) : undefined
    }
    if(data.nodeType == "RootArchNode")
        return new RootArchNode(Object.assign({}, base , {folders: data.folders,parameters: data.parameters}))

    if(data.nodeType == "ArchFileNode")
        return new ArchFileNode(Object.assign({}, base , {fileId: data.fileId}))
        
    if(data.nodeType == "ArchFolderNode")
        return new ArchFolderNode(base)
        
    if(data.nodeType == "ArchFolderDiscontinuityNode")
        return new ArchFolderDiscontinuityNode(base)

    if(data.nodeType == "ArchFolderObservationNode")
        return new ArchFolderObservationNode(base)
    
    if(data.nodeType == "ArchFolderRemoteNode")
        return new ArchFolderRemoteNode(base)

    if(data.nodeType == "ArchDiscontinuityNode")
        return new ArchDiscontinuityNode(Object.assign({}, base , { children: base.children || []}))

    if(data.nodeType == "ArchBoundaryConditionNode")
        return new ArchBoundaryConditionNode(Object.assign({}, base , {parameters: data.parameters}))

    if(data.nodeType == "ArchDiscontinuityMeshNode")
        return new ArchDiscontinuityMeshNode(Object.assign({}, base , {fileId: data.fileId, boundingBox: data.boundingBox}))

    if(data.nodeType == "ArchObservationNode")
        return new ArchObservationNode(Object.assign({}, base , {fileId: data.fileId}))
    
    if(data.nodeType == "ArchAndersonianRemoteNode")
        return new ArchAndersonianRemoteNode(Object.assign({}, base , {parameters: data.parameters}))
    
    if(data.nodeType == "ArchCoulombConstraintNode")
        return new ArchCoulombConstraintNode(Object.assign({}, base , {parameters: data.parameters}))

    if(data.nodeType == "ArchCoulombOrthoConstraintNode")
        return new ArchCoulombOrthoConstraintNode(Object.assign({}, base , {parameters: data.parameters}))

    
    if(data.nodeType == "ArchDisplacementConstraintNode")
        return new ArchDisplacementConstraintNode(Object.assign({}, base , {parameters: data.parameters}))

    if(data.nodeType == "ArchDisplacementNormConstraintNode")
        return new ArchDisplacementNormConstraintNode(Object.assign({}, base , {parameters: data.parameters}))
    
    if(data.nodeType == "ArchRealizationNode")
        return new ArchRealizationNode (Object.assign({}, base , {fileId: data.fileId, solutionId: data.solutionId, meshFileId:data.meshFileId}))

    return new ArchNode(base)
    }
*/

/*
export class ArchDisplacementConstraintNode extends ArchConstraintNode {

    nodeType = "ArchDisplacementConstraintNode"
    ArchFacade = ArchFacade.DisplacementConstraint
    constructor( { id, ownerId, name, parameters } : {id:string, ownerId: string, name:string,
        parameters?:{axis:string,direction:string, value: number,type:string}}){ 
        super({ id, ownerId, name, parameters:parameters||{axis:'0',direction:'compression', value: 0,type:'max'}})
    }
}

export class ArchDisplacementNormConstraintNode extends ArchConstraintNode {

    nodeType = "ArchDisplacementNormConstraintNode"
    ArchFacade = ArchFacade.DisplacementNormConstraint

    constructor( {  id, ownerId, name, parameters } : {id:string, ownerId: string, name:string,
        parameters?:{direction:string, value: number,type:string}}){ 
        super({ id, ownerId, name, parameters:parameters||{value: 0, direction:'compression', type:'max'}})
    }
}
*/
