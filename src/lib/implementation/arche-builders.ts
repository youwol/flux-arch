import { findChild, findChildren, retrieveThreeMeshes } from './utils';

import { ArchBoundaryConditionNode, ArchRemoteNode, ArchConstraintNode, ArchDiscontinuityNode,ArchNode, ArchAndersonianRemoteNode, ArchMeshNode, ArchMaterialNode } from './tree-nodes'
import { from, Observable } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';

import { decodeGocadTS } from '@youwol/io'
import { ArchFacade } from '../arche.facades';
import { BufferGeometry, Mesh, Object3D } from 'three';
import { BemSurface } from '../types.arche';
import { arche } from '../main';


type Gocad = { indices: Array<number>, positions: Array<number> }


export function buildModel(root: ArchNode, drive): Observable<ArchFacade.Model> {

    return buildArchSurfaces(root, drive)
        .pipe(
            map((surfaces) =>{
                let remotes = findChildren<ArchRemoteNode>(root, ArchRemoteNode).map(r =>{
                    return new r['ArchFacade'](r.parameters)
                })
                let material = findChild<ArchMaterialNode>(root, ArchMaterialNode)
                return new ArchFacade.Model({
                surfaces: surfaces,
                material: new ArchFacade.Material(material.parameters),
                remotes,
                solver: undefined
            })})
        )
}


export function buildArchSurfaces(node: ArchNode, drive) {

    let nodesDiscontinuities = findChildren(node, ArchDiscontinuityNode) as Array<ArchDiscontinuityNode>
    return from(nodesDiscontinuities).pipe(
        mergeMap(discontinuity => {
            let meshes = findChildren<ArchMeshNode>(discontinuity, ArchMeshNode) as Array<ArchMeshNode>
            return from(meshes).pipe(
                mergeMap(mesh => drive.readAsText(mesh.fileId)),
                reduce((acc, e) => acc.concat(e), []),
                map(contents => ({ node: discontinuity, meshesContent: contents })
                ))
        }),
        map(({ node, meshesContent }) => {
            return {
                node,
                meshes: meshesContent.map(meshText => decodeGocadTS(meshText, { shared: true }))
            }
        }),
        map(({ meshes, node }) => {
            /*let nested = meshes.map(mesh => buildSurfacesFromGocad(mesh, node))
            return nested.reduce((acc, e) => { return acc.concat(e) }, [])*/
            return []
        }),
        reduce((acc, e) => { return acc.concat(e) }, []),
    )
}


export function buildSurfacesFromGocad(objects: Gocad | Array<Gocad>, node: ArchDiscontinuityNode): Array<ArchFacade.Surface> {

    if (!Array.isArray(objects))
        return buildSurfacesFromGocad([objects], node)

    let surfaces = objects.map(object => {

        let constraintNodes = findChildren<ArchConstraintNode>(node, ArchConstraintNode)
        let bcNode = findChild<ArchBoundaryConditionNode>(node, ArchBoundaryConditionNode)
        let sharedPositions = new Float32Array(new SharedArrayBuffer( 4 * object.positions.length))
        sharedPositions.set(Float32Array.from(object.positions),0)
        let sharedIndexes = new Uint16Array(new SharedArrayBuffer( 2 * object.indices.length))
        sharedIndexes.set(Uint16Array.from(object.indices),0)
        return new ArchFacade.Surface({
            positions: sharedPositions,
            indexes:  sharedIndexes,
            boundaryCondition: new ArchFacade.BoundaryCondition(bcNode.parameters),
            constraints: constraintNodes.map(c => new c['ArchFacade'](c.parameters ))
        })
    })
    return surfaces
}


export function buildSurfacesFromThree(data: Object3D | Array<any>, report = undefined): Array<ArchFacade.Surface> {

    let meshes = retrieveThreeMeshes(data)
    let bc :  ArchFacade.BoundaryCondition = Array.isArray(data) && data.find( d => d instanceof ArchFacade.BoundaryCondition)
    let constraints : Array<ArchFacade.Constraint> = Array.isArray(data) && data.filter( d => d instanceof ArchFacade.Constraint)
    let surfaces = meshes.map(mesh => {

        let bufferGeom = mesh.geometry as BufferGeometry
        let t0 = performance.now()
        let indexes = Uint16Array.from(bufferGeom.index.array)
        let positions = Float32Array.from(bufferGeom.attributes.position.array)
        let t1 = performance.now()
        let surface =new ArchFacade.Surface({positions,indexes, constraints,boundaryCondition:bc})
        let t2 = performance.now()
        report && report.addElapsedTime("duplicate indexes, positions", t1 - t0, {})
        report && report.addElapsedTime("buildSurface", t2 - t1, {})
        return surface
    })
    return surfaces
}