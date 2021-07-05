
import {instantiateModules, parseGraph} from "@youwol/flux-core"
import { MockEnvironment } from './mock-environment'
import { map, share, skip, take } from 'rxjs/operators'
import { ProjectMgr } from '../lib/project-mgr.module'
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { ArcheDiscontinuityNode, ArcheFolderDiscontinuityNode, ArcheFolderObservationNode, ArcheObservationMeshNode, ArcheObservationNode, ArcheRealizationNode} from '../lib/implementation/tree-nodes'
import { findChild, findChildren } from '../lib/implementation/utils'
import { getActions } from '../lib/views/tree-elements.view'
//import { getAbsoluteTestDataPath } from '../../../shared/test/utils'
import { KeplerMesh } from '@youwol/flux-kepler'

import * as fs from 'fs'
import { BufferGeometry } from 'three'
import { DataFrame, Serie } from '@youwol/dataframe'
import { ImmutableTree } from '@youwol/fv-tree'

export function createWorkflowGraphBase() {
    let branches = [
        '|~mockEnv~|----|~projectMgr~|--'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr:         ProjectMgr,
    })
    let observers   = {}
    let adaptors    = {}
    return [modules,parseGraph( { branches, modules, adaptors, observers } )]
}

export function loadDiscontinuityS1(fromIndex, modules, 
    {onInitialLoad, onDiscontinuityAdded, onDiscontinuityMeshAdded, onSolutionComputed} : 
    {   onInitialLoad?: (ProjectMgrOutput)=>void, 
        onDiscontinuityAdded?: (ProjectMgrOutput)=>void, 
        onDiscontinuityMeshAdded?: (ProjectMgrOutput)=>void, 
        onSolutionComputed?: (ProjectMgrOutput)=>void}
    ){

    modules.projectMgr.output$.pipe(skip(fromIndex), take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // expect initial load => add discontinuity
        onInitialLoad && onInitialLoad(data)
        let rootNode = data.state.node
        let folderNode = findChild<ArcheFolderDiscontinuityNode>(rootNode,ArcheFolderDiscontinuityNode)
        let actions = getActions(data.manager.tree, folderNode)
        setTimeout( ()=> actions.find( action => action.name=='add discontinuity').exe(), 0)
    }) 

    modules.projectMgr.output$.pipe(skip(fromIndex+1),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput)=> {
        // expect discontinuity added => add S1.ts mesh
        onDiscontinuityAdded && onDiscontinuityAdded(data)
        let rootNode = data.state.node
        let discontinuityNode = findChildren<ArcheDiscontinuityNode>(rootNode,ArcheDiscontinuityNode)
        let dataPath = ""//getAbsoluteTestDataPath('geophysics/arche/model_test_S1/S1.ts')
        fs.readFile(dataPath,'utf-8', (err, content) => {
            expect(err).toBeNull()
            data.manager.tree.dropFile(discontinuityNode[0], "S1.ts", new Blob([content]) as any)
        });
    }) 

    modules.projectMgr.output$.pipe(skip(fromIndex+2),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        //  expect S1.ts discontinuity mesh added => nothing more
        onDiscontinuityMeshAdded && onDiscontinuityMeshAdded(data)
    })  
    modules.projectMgr.output$.pipe(skip(fromIndex+3),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // expect the solution has computed => nothing more
        onSolutionComputed && onSolutionComputed(data)
    }) 
    return fromIndex+3
}


export function addSimpleShape(fromIndex, modules, targetShapeName: string,
    { onMeshAdded, onResolutionDone, onObject3DBuilt } :
    {
        onMeshAdded?: (ProjectMgrOutput)=>void, 
        onResolutionDone?: (ProjectMgrOutput)=>void, 
        onObject3DBuilt?: (ProjectMgrOutput, KeplerObject3D)=>void, 

    },
    solutionId?:string
    ){

        modules.projectMgr.output$.pipe(skip(fromIndex),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
            
            let obsNode = findChild<ArcheFolderObservationNode>(data.state.node, ArcheFolderObservationNode)
            let actions = getActions(data.manager.tree, obsNode)
            setTimeout( ()=> {
                actions.find( action => action.name==targetShapeName).exe()
            }, 0)
        })
        modules.projectMgr.output$.pipe(skip(fromIndex+1),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
            
            expect(data.state.solution).toBeDefined()
            solutionId && expect(data.state.solution.solutionId).toEqual(solutionId)
            let lastCmd = data.state.withCommands.slice(-1)[0]

            let addMeshCmd = lastCmd
            expect(addMeshCmd).toBeInstanceOf( ImmutableTree.AddChildCommand)
            expect(addMeshCmd['parentNode']).toBeInstanceOf(ArcheFolderObservationNode)
            expect(addMeshCmd['childNode']).toBeInstanceOf(ArcheObservationNode)

            let observationNode = addMeshCmd['childNode']
            expect(observationNode.children[0]).toBeInstanceOf(ArcheObservationMeshNode)
            let meshNode = observationNode.children[0]
            expect(meshNode.children.length).toEqual(0)
            // Expected: the mesh of the simple shape has been added, no resolution computed
            onMeshAdded && onMeshAdded(data)
        }) 
        modules.projectMgr.output$.pipe(skip(fromIndex+2),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {

            // Expected: resolution on the mesh has been computed
            onResolutionDone && onResolutionDone(data)

            let newNode =  data.state.withCommands.slice(-1)[0]['newNode']
            
            data.manager.buildObject3D(newNode.children[0].id).subscribe(
                (object3d: KeplerMesh) => {
                    onObject3DBuilt && onObject3DBuilt(data, object3d)
                }
            )
        })
    return fromIndex+2
}



export function addOneChildNodeWithSolutionCheck(
    modules,  
    createChildFct: (data:ProjectMgrOutput) => void,
    updateChildFct: (data:ProjectMgrOutput) => void,
    {
        onNodeAdded,
        onFirstSolutionComputed,
        onFirstRealizationComputed,
        onChildUpdated,
        onSecondSolutionComputed,
        onSecondRealizationComputed,
    } :
    {
        onNodeAdded?: (data:ProjectMgrOutput) => void,
        onFirstSolutionComputed?: (data:ProjectMgrOutput) => void,
        onFirstRealizationComputed?: (data:ProjectMgrOutput, df: Serie) => void,
        onChildUpdated?: (data:ProjectMgrOutput) => void,
        onSecondSolutionComputed?: (data:ProjectMgrOutput) => void,
        onSecondRealizationComputed?: (data:ProjectMgrOutput, df: Serie) => void,
    }) {
    let solutionId = undefined
    let onSolutionComputed = (data:ProjectMgrOutput) => {
        solutionId = data.state.solution.solutionId
    }
    let lastCmd = loadDiscontinuityS1(0, modules,{onSolutionComputed})    
    lastCmd = addSimpleShape(lastCmd, modules, 'plane xy',{})

    modules.projectMgr.output$.pipe(skip(lastCmd),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the observation mesh is updated => add default Andersonian remote

        expect(data.state.solution.solutionId).toEqual(solutionId)
        setTimeout( ()=> createChildFct(data), 0)
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+1),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the andersonian remote is added, solution has been discarded
        onNodeAdded && onNodeAdded(data)
        expect(data.state.solution).toBeUndefined()        
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+2),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // solution has been updated
        onFirstSolutionComputed && onFirstSolutionComputed(data)

        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId != solutionId).toBeTruthy() 
        solutionId = solution.solutionId 
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+3),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // realization has been updated
        
        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId).toEqual(solutionId) 
        let realizationNode = findChild<ArcheRealizationNode>(data.state.node,ArcheRealizationNode)
        data.manager.buildObject3D(realizationNode.id).subscribe( (object3d:KeplerMesh) => {
        
            let geometry = object3d.geometry as BufferGeometry    
            expect(object3d.dataframe).toBeDefined()
            expect(Object.keys(object3d.dataframe.series)).toEqual(['stress'])
            let stress = object3d.dataframe.series.stress
            expect(stress.array.length).toEqual(geometry.getAttribute('position').count)
            onFirstRealizationComputed && onFirstRealizationComputed( data, stress )
        })
        setTimeout( ()=> updateChildFct(data) , 0)
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+4),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the andersonian remote is added, solution has been discarded
        onChildUpdated && onChildUpdated(data)
        expect(data.state.solution).toBeUndefined() 
              
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+5),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // solution has been updated

        onSecondSolutionComputed && onSecondSolutionComputed(data)

        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId != solutionId).toBeTruthy() 
        solutionId = solution.solutionId       
    })
    modules.projectMgr.output$.pipe(skip(lastCmd+6),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
         // realization has been updated

         expect(data.state.solution).toBeDefined()  
         expect(data.state.solution.solutionId).toEqual(solutionId) 
         let realizationNode = findChild<ArcheRealizationNode>(data.state.node,ArcheRealizationNode)
         data.manager.buildObject3D(realizationNode.id).subscribe( (object3d:KeplerMesh) => {
         
             let geometry = object3d.geometry as BufferGeometry    
             expect(object3d.dataframe).toBeDefined()
             expect(Object.keys(object3d.dataframe.series)).toEqual(['stress'])
             let stress = object3d.dataframe.series.stress
             expect(stress.array.length).toEqual(geometry.getAttribute('position').count)
             onSecondRealizationComputed && onSecondRealizationComputed( data, stress )    
         }) 
    })
    return lastCmd+6
}

