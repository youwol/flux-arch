import { findChild, findChildren, retrieveThreeMeshes } from './implementation/utils';

import { ArcheBoundaryConditionNode, ArcheRemoteNode, ArcheConstraintNode, ArcheDiscontinuityNode,ArcheNode, ArcheAndersonianRemoteNode, ArcheMeshNode, ArcheMaterialNode } from './implementation/tree-nodes'
import { from, Observable } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';

import { decodeGocadTS } from '@youwol/io'
import { ArcheFacade } from './arche.facades';
import { BufferGeometry, Mesh, Object3D } from 'three';
import { BemSurface } from './types.arche';
import { arche } from './factory';


type Gocad = { indices: Array<number>, positions: Array<number> }


export function buildModel(root: ArcheNode, drive): Observable<ArcheFacade.Model> {

    return buildArcheSurfaces(root, drive)
        .pipe(
            map((surfaces) =>{
                let remotes = findChildren<ArcheRemoteNode>(root, ArcheRemoteNode).map(r =>{
                    return new r['ArcheFacade'](r.parameters)
                })
                let material = findChild<ArcheMaterialNode>(root, ArcheMaterialNode)
                return new ArcheFacade.Model({
                surfaces: surfaces,
                material: new ArcheFacade.Material(material.parameters),
                remotes
            })})
        )
}


export function buildArcheSurfaces(node: ArcheNode, drive) {

    let nodesDiscontinuities = findChildren(node, ArcheDiscontinuityNode) as Array<ArcheDiscontinuityNode>
    return from(nodesDiscontinuities).pipe(
        mergeMap(discontinuity => {
            let meshes = findChildren<ArcheMeshNode>(discontinuity, ArcheMeshNode) as Array<ArcheMeshNode>
            return from(meshes).pipe(
                mergeMap(mesh => drive.readAsText(mesh.fileId)),
                reduce((acc, e) => acc.concat(e), []),
                map(contents => ({ node: discontinuity, meshesContent: contents })
                ))
        }),
        map(({ node, meshesContent }) => {
            return {
                node,
                meshes: meshesContent.map(meshText => decodeGocadTS(meshText, { collapse: false }))
            }
        }),
        map(({ meshes, node }) => {
            let nested = meshes.map(mesh => buildSurfacesFromGocad(mesh, node))
            return nested.reduce((acc, e) => { return acc.concat(e) }, [])
        }),
        reduce((acc, e) => { return acc.concat(e) }, []),
    )
}


export function buildSurfacesFromGocad(objects: Gocad | Array<Gocad>, node: ArcheDiscontinuityNode): Array<ArcheFacade.Surface> {

    if (!Array.isArray(objects))
        return buildSurfacesFromGocad([objects], node)

    let surfaces = objects.map(object => {

        let constraintNodes = findChildren<ArcheConstraintNode>(node, ArcheConstraintNode)
        let bcNode = findChild<ArcheBoundaryConditionNode>(node, ArcheBoundaryConditionNode)
        let sharedPositions = new Float32Array(new SharedArrayBuffer( 4 * object.positions.length))
        sharedPositions.set(Float32Array.from(object.positions),0)
        let sharedIndexes = new Uint16Array(new SharedArrayBuffer( 2 * object.indices.length))
        sharedIndexes.set(Uint16Array.from(object.indices),0)
        return new ArcheFacade.Surface({
            positions: sharedPositions,
            indexes:  sharedIndexes,
            boundaryCondition: new ArcheFacade.BoundaryCondition(bcNode.parameters),
            constraints: constraintNodes.map(c => new c['ArcheFacade'](c.parameters ))
        })
    })
    return surfaces
}


export function buildSurfacesFromThree(data: Object3D | Array<any>, report = undefined): Array<ArcheFacade.Surface> {

    let meshes = retrieveThreeMeshes(data)
    let bc :  ArcheFacade.BoundaryCondition = Array.isArray(data) && data.find( d => d instanceof ArcheFacade.BoundaryCondition)
    let constraints : Array<ArcheFacade.Constraint> = Array.isArray(data) && data.filter( d => d instanceof ArcheFacade.Constraint)
    let surfaces = meshes.map(mesh => {

        let bufferGeom = mesh.geometry as BufferGeometry
        let t0 = performance.now()
        let indexes = Uint16Array.from(bufferGeom.index.array)
        let positions = Float32Array.from(bufferGeom.attributes.position.array)
        let t1 = performance.now()
        let surface =new ArcheFacade.Surface({positions,indexes, constraints,boundaryCondition:bc})
        let t2 = performance.now()
        report && report.addElapsedTime("duplicate indexes, positions", t1 - t0, {})
        report && report.addElapsedTime("buildSurface", t2 - t1, {})
        return surface
    })
    return surfaces
}