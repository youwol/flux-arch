
import { Runner} from "@youwol/flux-lib-core"
import { map, skip, take } from 'rxjs/operators'
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { ArcheDiscontinuityNode, ArcheFolderDiscontinuityNode, ArcheFolderObservationNode, ArcheFolderRemoteNode, 
    ArcheDiscontinuityMeshNode, ArcheMaterialNode, ArcheObservationMeshNode, ArcheObservationNode, ArcheRealizationNode } from '../lib/implementation/tree-nodes'
import { findChild, findChildren } from '../lib/implementation/utils'
import { getActions } from '../lib/views/tree-elements.view'
import { Tree } from '@youwol/flux-lib-views'
import { ArcheFacade } from '../lib/arche.facades'
import { KeplerObject3D } from '@youwol/flux-pack-kepler'
import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import * as _ from 'lodash'
import { addSimpleShape, createWorkflowGraphBase, loadDiscontinuityS1 } from './test-utils'
import { MockDriveImplementation } from '../../../shared/test/mock-drive'
import { FileSystem } from '@youwol/flux-pack-shared-interfaces'

console.log = () => {}

test('new project', (done) => {
    
    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 
    modules.projectMgr.output$.pipe(take(1)).subscribe( ({data}:{data:ProjectMgrOutput}) => {
        
        expect(data).toBeInstanceOf(ProjectMgrOutput)
        let rootNode = data.state.node
        expect(rootNode.resolvedChildren().length).toEqual(4)
        let folderDiscontinuities = findChildren<ArcheFolderDiscontinuityNode>(rootNode,ArcheFolderDiscontinuityNode)
        expect(folderDiscontinuities.length).toEqual(1)
        let materialNodes = findChildren<ArcheMaterialNode>(rootNode,ArcheMaterialNode)
        expect(materialNodes.length).toEqual(1)
        let folderRemotes = findChildren<ArcheFolderRemoteNode>(rootNode,ArcheFolderRemoteNode)
        expect(folderRemotes.length).toEqual(1)
        let folderObservation = findChildren<ArcheFolderObservationNode>(rootNode,ArcheFolderObservationNode)
        expect(folderObservation.length).toEqual(1)

        expect(data.state.initial.node).toEqual(data.state.node)
        done()
    }) 

    modules.mockEnv.send()
})


test('add Discontinuity', (done) => {

    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 
    
    let onInitialLoad = (data:ProjectMgrOutput) => {
        let rootNode = data.state.node
        let folderNode = findChild<ArcheFolderDiscontinuityNode>(rootNode,ArcheFolderDiscontinuityNode)

        let actions = getActions(data.manager.tree, folderNode)
        expect(actions.length).toEqual(3)
        expect(actions.find( action => action.name=='new folder')).toBeDefined()
        expect(actions.find( action => action.name=='add discontinuity')).toBeDefined()
        expect(actions.find( action => action.name=='rename')).toBeDefined()
    }
    let onDiscontinuityAdded = (data:ProjectMgrOutput) => {
        let rootNode = data.state.node
        let discontinuityNode = findChildren<ArcheDiscontinuityNode>(rootNode,ArcheDiscontinuityNode)
        expect(discontinuityNode.length).toEqual(1)
    }

    let onDiscontinuityMeshAdded = (data:ProjectMgrOutput) => {

        let rootNode = data.state.node
        expect(data.state.solution).toBeUndefined()
        let meshNodes = findChildren<ArcheDiscontinuityMeshNode>(rootNode,ArcheDiscontinuityMeshNode)
        expect(meshNodes.length).toEqual(1)
        let commands = data.state.withCommands
        expect(commands.length).toEqual(2)
        let addMeshCmd = commands[1]
        expect(addMeshCmd).toBeInstanceOf( Tree.AddChildCommand)
        expect(addMeshCmd['parentNode']).toBeInstanceOf(ArcheDiscontinuityNode)
        expect(addMeshCmd['childNode']).toBeInstanceOf(ArcheDiscontinuityMeshNode)
        data.manager.buildObject3D(addMeshCmd['childNode'].id).subscribe(
            (object3d: Mesh) => {
                let geometry = object3d.geometry as BufferGeometry
                expect(geometry.getAttribute('position').count).toEqual(288)
            }
        )
    }

    let onSolutionComputed = (data:ProjectMgrOutput) => {
        expect(data.state.solution).toBeDefined()
        expect(data.state.solutionChanged).toBeTruthy()
        let commands = data.state.withCommands
        expect(commands.length).toEqual(2)
    }

    let lastUpdateIndex = loadDiscontinuityS1(0,modules, {onInitialLoad, onDiscontinuityAdded, 
        onDiscontinuityMeshAdded, onSolutionComputed})

    modules.projectMgr.output$.pipe(skip(lastUpdateIndex),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // expect the solution has computed => nothing more
        done()
    })
    
    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]
    })
})


test('add plane xy', (done) => {
    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 
    
    let solutionId = undefined
    let onSolutionComputed = (data:ProjectMgrOutput) => {
        solutionId = data.state.solution.solutionId
    }
    let onMeshAdded = (data:ProjectMgrOutput) => {
        expect(data.state.solution).toBeDefined()
        expect(data.state.solution.solutionId).toEqual(solutionId)
        let commands = data.state.withCommands
        expect(commands.length).toEqual(3)

        let addMeshCmd = commands[2]
        expect(addMeshCmd).toBeInstanceOf( Tree.AddChildCommand)
        expect(addMeshCmd['parentNode']).toBeInstanceOf(ArcheFolderObservationNode)
        expect(addMeshCmd['childNode']).toBeInstanceOf(ArcheObservationNode)

        let observationNode = addMeshCmd['childNode']
        expect(observationNode.children[0]).toBeInstanceOf(ArcheObservationMeshNode)
        let meshNode = observationNode.children[0]
        expect(meshNode.children.length).toEqual(0)
    }
    let onResolutionDone = (data:ProjectMgrOutput) => {
        expect(data.state.solution).toBeDefined()
        expect(data.state.solution.solutionId).toEqual(solutionId)
        let commands = data.state.withCommands
        expect(commands.length).toEqual(4)

        let addMeshCmd = commands[3]
        expect(addMeshCmd).toBeInstanceOf( Tree.ReplaceNodeCommand)
        let oldNode = addMeshCmd['oldNode']
        let newNode = addMeshCmd['newNode']
        expect(oldNode).toBeInstanceOf(ArcheObservationMeshNode)
        expect(newNode).toBeInstanceOf(ArcheObservationMeshNode)
        expect(oldNode.children.length).toEqual(0)
        expect(newNode.children.length).toEqual(1)
        expect(newNode.children[0]).toBeInstanceOf(ArcheRealizationNode)
    }

    let onObject3DBuilt = (data: ProjectMgrOutput,  object3d:KeplerObject3D) => {
        let geometry = object3d.geometry as BufferGeometry
        let positions = Array.from(geometry.getAttribute('position').array).map( d => Math.floor(d))
        expect(positions.length).toEqual(12)
        expect(positions).toEqual([-1121,-2249,-1169,-1121,2031,-1169,505,2031,-1169,505,-2249,-1169])
        expect(object3d.dataframe).toBeDefined()
        expect(object3d.dataframe.columns()).toEqual(['stress'])
        let stress = object3d.dataframe.serie('stress')
        expect(stress.values().length).toEqual(4)
        stress.values().forEach( value => expect(value).toEqual([0.25,1,1000])) // see line 'modules.mockEnv.send(...)

        done()
    }

    let lastLoadIndex = loadDiscontinuityS1(0,modules,{onSolutionComputed})
    
    addSimpleShape(lastLoadIndex, modules, 'plane xy',{ onMeshAdded, onResolutionDone, onObject3DBuilt})

    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]
    })
})


test('add disk xy', (done) => {
    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 
    
    let onObject3DBuilt = (data: ProjectMgrOutput, object3d:KeplerObject3D) => {
        let geometry = object3d.geometry as BufferGeometry
        let positions = _.chunk( Array.from(geometry.getAttribute('position').array).map( d => Math.floor(d)), 3)
        let xs = positions.map( xyz => xyz[0])
        let ys = positions.map( xyz => xyz[1])
        let zs = positions.map( xyz => xyz[2])
        expect([Math.min(...xs), Math.max(...xs),Math.min(...ys),Math.max(...ys)]).toEqual([-2448,1832,-2249,2031])
        expect(Math.min(...zs)).toEqual(-1169)
        expect(Math.max(...zs)).toEqual(-1169)

        expect(object3d.dataframe).toBeDefined()
        expect(object3d.dataframe.columns()).toEqual(['stress'])
        let stress = object3d.dataframe.serie('stress')
        expect(stress.values().length).toEqual(geometry.getAttribute('position').count)
        stress.values().forEach( value => expect(value).toEqual([0.25,1,1000])) // see line 'modules.mockEnv.send(...)
        
        done()
    }

    let lastLoadIndex = loadDiscontinuityS1(0,modules,{})    
    addSimpleShape(lastLoadIndex, modules, 'disk xy', {onObject3DBuilt})

    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]
    })
})


test('save mesh & selectionWatch', (done) => {
    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 
    

    let onResolutionDone = (data:ProjectMgrOutput) => {
        let newNode = data.state.withCommands[3]['newNode']
        data.manager.addSelectionWatch(newNode)
    }


    let onObject3DBuilt = (data: ProjectMgrOutput, object3d:KeplerObject3D) => {
        let geometry = object3d.geometry as BufferGeometry
        let positions = _.chunk( Array.from(geometry.getAttribute('position').array).map( d => Math.floor(d)), 3)
        let newPositions = positions.map( ([x,y,z]) => [x,y,0]).reduce( (acc,e) => acc.concat(e), []);
        geometry.setAttribute('position', new BufferAttribute(Float32Array.from(newPositions),3) )

        let drive = new MockDriveImplementation.Drive("mockDrive",'test-drive')
        let realizationNode = findChild<ArcheRealizationNode>(data.state.node, ArcheRealizationNode)
        let node = findChild<ArcheObservationMeshNode>(data.state.node, ArcheObservationMeshNode)
        expect(realizationNode.id).toEqual(object3d.name)
        drive.getFile( node.fileId ).subscribe(
            (file:FileSystem.File) => {
                data.manager.saveMesh(file, object3d)
            }
        )
    }

    let lastCmd = loadDiscontinuityS1(0,modules,{})    
    lastCmd = addSimpleShape(lastCmd, modules, 'disk xy', {onResolutionDone, onObject3DBuilt})


    modules.projectMgr.output$.pipe(skip(lastCmd +1),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the observation mesh is updated
        expect(data.selection.nodes.length).toEqual(1)
        let newMeshNode = data.selection.nodes[0]
        expect(newMeshNode).toBeInstanceOf(ArcheObservationMeshNode)
        expect(newMeshNode.resolvedChildren().length).toEqual(0)
        data.manager.buildObject3D(newMeshNode.id).subscribe(
            (object3d: KeplerObject3D) => {
                let geometry = object3d.geometry as BufferGeometry
                let positions = _.chunk( Array.from(geometry.getAttribute('position').array).map( d => Math.floor(d)), 3)
                let zSum = positions.reduce( (acc,e)=> acc + e[2], 0)
                expect(zSum).toEqual(0)
            }
        )
    })

    modules.projectMgr.output$.pipe(skip(lastCmd +2),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the realization has been computed
        expect(data.selection.nodes.length).toEqual(1)
        let newMeshNode = data.selection.nodes[0]
        expect(newMeshNode).toBeInstanceOf(ArcheObservationMeshNode)
        expect(newMeshNode.resolvedChildren().length).toEqual(1)
        let realization = newMeshNode.resolvedChildren()[0]
        expect(realization).toBeInstanceOf(ArcheRealizationNode)
        done()
    })


    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]
    })
})

