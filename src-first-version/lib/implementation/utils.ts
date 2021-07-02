import { FileSystem } from '@youwol/flux-pack-shared-interfaces'
import { map, mergeMap, take } from 'rxjs/operators'
import { BufferAttribute, BufferGeometry, Group, Mesh } from 'three'
import * as _ from 'lodash'
import { ArcheFolderDiscontinuityNode, ArcheMeshNode, ArcheNode, ArcheObservationMeshNode, ArcheObservationNode, 
    ArcheRealizationNode, RootArcheNode } from './tree-nodes'
import { TreeViewState } from './data'

import { encodeGocadTS } from '@youwol/io'
import { Tree } from '@youwol/flux-lib-views'
import { uuidv4 } from '@youwol/flux-lib-core'


export function retrieveThreeMeshes(data: any): Array<Mesh> {

    if (!Array.isArray(data))
        return retrieveThreeMeshes([data])

    let threeObjs = data
    .filter(d => (d instanceof Mesh) || (d instanceof Group) )
    
    return threeObjs.map(d => {
            if (d instanceof Mesh)
                return [d]
            if (d instanceof Group)
                return d.children.filter(d => d instanceof Mesh) as Array<Mesh>
        })
        .reduce((acc, e) => [...acc, ...e], [])
}

type Gocad = { indices: Array<number>, positions: Array<number> }



export let defaultPythonScript = `

function run(){
    
}
    `

export function findChildren<T>(node, T, filterFct = (d) => true ): Array<T>{
    if(node instanceof T)
        return [node]
    if(node.children)
        return node.children.map( child => findChildren(child, T)).filter(filterFct).reduce((acc,e)=> acc.concat(e), [])
    return []
}

export function findChild<T>(node, T, filterFct = (d) => true): T{
    return findChildren<T>(node, T, filterFct = (d) => true)[0]
}

export interface BoundingBox{
    min:{x,y,z}
    max:{x,y,z}
}

export function getBoundingBox( gocadObj : Array<Gocad> | Gocad) : BoundingBox {

    let positions = Array.isArray(gocadObj) 
        ? gocadObj.reduce( (acc,e) => acc.concat(e.positions),[]) 
        : gocadObj.positions
    positions = _.chunk(positions,3)
    let xs = positions.map( p => p[0])
    let ys = positions.map( p => p[1])
    let zs = positions.map( p => p[2])
    return { 
        min: { x:Math.min(...xs),y:Math.min(...ys),z:Math.min(...zs)},
        max: { x:Math.max(...xs),y:Math.max(...ys),z:Math.max(...zs)} 
    }
       
}

export function getSceneBoundingBox(root:RootArcheNode): BoundingBox {
    let rootDiscontinuity = findChild<ArcheFolderDiscontinuityNode>(root,ArcheFolderDiscontinuityNode)
    let children = findChildren<ArcheMeshNode>(rootDiscontinuity,ArcheMeshNode)
    if(children.length==0){
        console.error("The bounding box can not be calculated: no discontinuities in the project", root)
        throw Error("The bounding box can not be calculated: no discontinuities in the project") 
    }
    return findChildren<ArcheMeshNode>(rootDiscontinuity,ArcheMeshNode)
    .map( node => node.boundingBox as any )
    .reduce( (acc,e) => ({ 
        min:{x:Math.min(acc.min.x,e.min.x),y:Math.min(acc.min.y,e.min.y),z:Math.min(acc.min.z,e.min.z)},
        max:{x:Math.max(acc.max.x,e.max.x),y:Math.max(acc.max.y,e.max.y),z:Math.max(acc.max.z,e.max.z)} }), 
        { min:{x:1e9,y:1e9,z:1e9},max:{x:-1e9, y:-1e9,z:-1e9} } )
}

export function createPlaneGeometry(orientation: string, bBox:BoundingBox): BufferGeometry {

    let indexes = [0,1,2,2,3,0]
    let geom = new BufferGeometry()
    let normal= ['x','y','z'].find( axe => {
        return !orientation.includes(axe)
    })

    let axis = ['x','y','z'].filter( axis => axis!=normal)
    let base = [ [bBox.min[axis[0]],bBox.min[axis[1]]], [bBox.min[axis[0]],bBox.max[axis[1]]], 
    [bBox.max[axis[0]],bBox.max[axis[1]]], [bBox.max[axis[0]],bBox.min[axis[1]]] ]
    let cst = 0.5*(bBox.min[normal]+bBox.max[normal])
    let pos = base
    .map( ([a,b]) => normal == 'z' ? [a,b,cst] : (normal == 'y' ? [a,cst,b] : [cst,a,b] ) )
    .reduce( (acc,e)=>acc.concat(e), [])

    geom.setAttribute('position', new BufferAttribute(Float32Array.from(pos),3))
    geom.setIndex(indexes)
    geom.computeBoundingBox()
    return geom
}

export function createDiskGeometry(orientation: string, bBox:BoundingBox): BufferGeometry {

    let length = 100
    let dt = 360 / length
    let indexes = Array.from({length:length-1}, (_, i) => [0,i+1,i+2]).reduce( (acc,e)=>acc.concat(e), [])
    indexes.push(0,length,1)
    let normal= ['x','y','z'].find( axe => {
        return !orientation.includes(axe)
    })
    let geom = new BufferGeometry()
    let axis = ['x','y','z'].filter( axis => axis!=normal)
    let cst = 0.5*(bBox.min[normal]+bBox.max[normal])
    let r = Math.max(bBox.max[axis[0]] - bBox.min[axis[0]] , bBox.max[axis[1]] - bBox.min[axis[1]]) / 2
    let [a0,b0] = [0.5*(bBox.max[axis[0]] + bBox.min[axis[0]] ) , 0.5*(bBox.max[axis[1]]+ bBox.min[axis[1]] ) ]
    let base = Array.from({length}, (_, i) => [ a0+r*Math.cos(Math.PI*i*dt/180),b0+r*Math.sin(Math.PI*i*dt/180)])
        

    let pos = [[a0,b0],...base].map( ([a,b] : [number, number]) =>{
        return normal == 'z' ? [a,b,cst] : (normal == 'y' ? [a,cst,b] : [cst,a,b] )
    }).reduce( (acc,e)=>acc.concat(e), [])
    
    geom.setAttribute('position', new BufferAttribute(Float32Array.from(pos),3))
    geom.setIndex(indexes)
    geom.computeBoundingBox()
    return geom
}




export function createSimpleShape(type: string, orientation:string, tree: TreeViewState, node: ArcheNode) {
    let folder = tree.environment.folder
    let drive = folder.drive

    tree.root$.pipe(
        take(1),
        mergeMap( rootNode => {
            let bBox = getSceneBoundingBox(rootNode as RootArcheNode)
            let geom = type == 'plane' 
                ? createPlaneGeometry(orientation,bBox)
                : createDiskGeometry(orientation,bBox)

            let s = encodeGocadTS({
                mng: undefined,
                positions: Array.from(geom.attributes.position.array),
                indices: Array.from(geom.index.array)
            })
            let uid = uuidv4()
            return drive.createFile(folder.id,`mesh-${uid}.ts`,new Blob([s])).pipe(
                map( (file:FileSystem.File) => 
                new ArcheObservationMeshNode(
                    {id: `mesh-${uid}`, ownerId:tree.id, name:'mesh',fileId:file.id,
                boundingBox: { 
                    min:{x:geom.boundingBox.min.x,y:geom.boundingBox.min.y,z:geom.boundingBox.min.z},
                    max:{x:geom.boundingBox.max.x,y:geom.boundingBox.max.y,z:geom.boundingBox.max.z}} 
                }))
            ) 
        })
    ).subscribe( (mesh: ArcheMeshNode) => {
        tree.addChild(node.id, new ArcheObservationNode(
            { id: "obsNode-" + mesh.id, ownerId:tree.id, name: `${type} (${orientation})`,
             type: ['folder'], children: [mesh] }))
    })
}

export function extractNewObservationMeshNodes( ownerId: string, solutionId: string, updates: Array<Tree.Updates<ArcheNode>>){

    if(updates.length==0)
        return []
    let lastTree = updates.slice(-1)[0].newTree
    let meshNodes =  findChildren<ArcheObservationMeshNode>(lastTree, ArcheObservationMeshNode)
    .filter( meshNode => { 
        let realization = findChild<ArcheRealizationNode>(meshNode,ArcheRealizationNode)
        if( realization && realization.solutionId == solutionId)
            return false
        return true
    })
    .filter( (meshNode) => meshNode.ownerId == ownerId )
    
    return meshNodes
}
