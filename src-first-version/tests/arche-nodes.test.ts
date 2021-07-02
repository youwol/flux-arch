
import { Runner} from "@youwol/flux-lib-core"
import { skip, take } from 'rxjs/operators'
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { ArcheDiscontinuityNode, ArcheFolderRemoteNode, 
     ArcheAndersonianRemoteNode, ArcheCoulombConstraintNode, ArcheCoulombOrthoConstraintNode } from '../lib/implementation/tree-nodes'
import { findChild } from '../lib/implementation/utils'
import { getActions } from '../lib/views/tree-elements.view'
import { ArcheFacade } from '../lib/arche.facades'
import * as _ from 'lodash'
import { addOneChildNodeWithSolutionCheck, createWorkflowGraphBase } from './test-utils'
import { MockEnvironment } from './mock-environment'

console.log = () =>{}

jest.setTimeout(5000)

test('andersonian remote', (done) => {

    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 

    let lastCmd = addOneChildNodeWithSolutionCheck(
        modules,  
        (data:ProjectMgrOutput) => {
            let rootNode = data.state.node
            let remoteFolder = findChild<ArcheFolderRemoteNode>(rootNode,ArcheFolderRemoteNode)
            getActions(data.manager.tree, remoteFolder).find( action => action.name=='add Andersonian stress').exe()
        },
        (data:ProjectMgrOutput) => {
            let remote = findChild<ArcheFolderRemoteNode>(data.state.node,ArcheAndersonianRemoteNode)
            let newRemote = new ArcheFacade.AndersonianRemote( {HSigma:1, hSigma:2, vSigma:3, theta:4})
            data.manager.saveNode(remote,newRemote)
        },
        {
            onNodeAdded: (data) => {
                let remote = findChild<ArcheAndersonianRemoteNode>(data.state.node,ArcheAndersonianRemoteNode)
                expect(remote).toBeDefined()
            },
            onFirstSolutionComputed: (data) => {
                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.remotes.length == 1)
                expect(solution.model.remotes[0]).toBeInstanceOf(ArcheFacade.AndersonianRemote)
            },
            onFirstRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([0,0,0,0])) // see line 'modules.mockEnv.send(...)
            },
            onChildUpdated: (data) => {
                let remote = findChild<ArcheAndersonianRemoteNode>(data.state.node,ArcheAndersonianRemoteNode)
                expect(remote).toBeDefined()
                expect(remote.parameters).toEqual({HSigma:1, hSigma:2, vSigma:3, theta:4}) 
            },
            onSecondSolutionComputed: (data)=> {

                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.remotes.length == 1)
                expect(solution.model.remotes[0]).toBeInstanceOf(ArcheFacade.AndersonianRemote)    
                expect(solution.model.remotes[0].parameters).toEqual({HSigma:1, hSigma:2, vSigma:3, theta:4})
            },
            onSecondRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([1,2,3,4])) // see line 'modules.mockEnv.send(...)
            },
        } 
    )

    modules.projectMgr.output$.pipe(skip(lastCmd),take(1)).subscribe(
        () => done()
    )

    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {

        if(model.remotes.length==0)
            return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]

        let r = model.remotes[0] as ArcheFacade.AndersonianRemote
        return [r.parameters.HSigma,r.parameters.hSigma,r.parameters.vSigma,r.parameters.theta]
    })
})


test('coulomb constraint', (done) => {

    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 

    let lastCmd = addOneChildNodeWithSolutionCheck(
        modules,  
        (data:ProjectMgrOutput) => {
            let rootNode = data.state.node
            let remoteFolder = findChild<ArcheDiscontinuityNode>(rootNode,ArcheDiscontinuityNode)
            getActions(data.manager.tree, remoteFolder).find( action => action.name=='add Coulomb constraint').exe()
        },
        (data:ProjectMgrOutput) => {
            let remote = findChild<ArcheCoulombConstraintNode>(data.state.node,ArcheCoulombConstraintNode)
            let newConstraint = new ArcheFacade.CoulombConstraint( {friction:1, cohesion:2})
            data.manager.saveNode(remote,newConstraint)
        },
        {
            onNodeAdded: (data) => {
                let remote = findChild<ArcheCoulombConstraintNode>(data.state.node,ArcheCoulombConstraintNode)
                expect(remote).toBeDefined()
            },
            onFirstSolutionComputed: (data) => {
                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.surfaces[0].constraints.length == 1)
                expect(solution.model.surfaces[0].constraints[0]).toBeInstanceOf(ArcheFacade.CoulombConstraint)
            },
            onFirstRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([0,0])) // see line 'modules.mockEnv.send(...)
            },
            onChildUpdated: (data) => {
                let constraint = findChild<ArcheCoulombConstraintNode>(data.state.node,ArcheCoulombConstraintNode)
                expect(constraint).toBeDefined()
                expect(constraint.parameters).toEqual({friction:1, cohesion:2}) 
            },
            onSecondSolutionComputed: (data)=> {

                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.remotes.length == 1)
                let constraint = solution.model.surfaces[0].constraints[0]
                expect(constraint).toBeInstanceOf(ArcheFacade.CoulombConstraint)    
                expect(constraint.parameters).toEqual({friction:1, cohesion:2})
            },
            onSecondRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([1,2])) // see line 'modules.mockEnv.send(...)
            },
        } 
    )

    modules.projectMgr.output$.pipe(skip(lastCmd),take(1)).subscribe(
        () => done()
    )

    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {

        if(model.surfaces[0].constraints.length==0)
            return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]

        let r = model.surfaces[0].constraints[0] as ArcheFacade.CoulombConstraint
        return [r.parameters.friction,r.parameters.cohesion]
    })
})


test('coulomb ortho constraint', (done) => {

    let [modules,graph] = createWorkflowGraphBase()

    new Runner( graph ) 

    let lastCmd = addOneChildNodeWithSolutionCheck(
        modules,  
        (data:ProjectMgrOutput) => {
            let rootNode = data.state.node
            let remoteFolder = findChild<ArcheDiscontinuityNode>(rootNode,ArcheDiscontinuityNode)
            getActions(data.manager.tree, remoteFolder).find( action => action.name=='add Coulomb-ortho constraint').exe()
        },
        (data:ProjectMgrOutput) => {
            let remote = findChild<ArcheCoulombConstraintNode>(data.state.node,ArcheCoulombOrthoConstraintNode)
            let newConstraint = new ArcheFacade.CoulombOrthoConstraint( {theta:1, frictionDip:2, frictionStrike:3})
            data.manager.saveNode(remote,newConstraint)
        },
        {
            onNodeAdded: (data) => {
                let remote = findChild<ArcheCoulombConstraintNode>(data.state.node,ArcheCoulombOrthoConstraintNode)
                expect(remote).toBeDefined()
            },
            onFirstSolutionComputed: (data) => {
                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.surfaces[0].constraints.length == 1)
                expect(solution.model.surfaces[0].constraints[0]).toBeInstanceOf(ArcheFacade.CoulombOrthoConstraint)
            },
            onFirstRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([0,0,0])) // see line 'modules.mockEnv.send(...)
            },
            onChildUpdated: (data) => {
                let constraint = findChild<ArcheCoulombOrthoConstraintNode>(data.state.node,ArcheCoulombOrthoConstraintNode)
                expect(constraint).toBeDefined()
                expect(constraint.parameters).toEqual({theta:1, frictionDip:2, frictionStrike:3}) 
            },
            onSecondSolutionComputed: (data)=> {

                let solution = data.state.solution as MockEnvironment.MockSolution
                expect(solution.model.remotes.length == 1)
                let constraint = solution.model.surfaces[0].constraints[0]
                expect(constraint).toBeInstanceOf(ArcheFacade.CoulombOrthoConstraint)    
                expect(constraint.parameters).toEqual({theta:1, frictionDip:2, frictionStrike:3})
            },
            onSecondRealizationComputed: (data, stress) => {
                stress.values().forEach( value => expect(value).toEqual([1,2,3])) // see line 'modules.mockEnv.send(...)
            },
        } 
    )

    modules.projectMgr.output$.pipe(skip(lastCmd),take(1)).subscribe(
        () => done()
    )

    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {

        if(model.surfaces[0].constraints.length==0)
            return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]

        let r = model.surfaces[0].constraints[0] as ArcheFacade.CoulombOrthoConstraint
        return [r.parameters.theta,r.parameters.frictionDip, r.parameters.frictionStrike]
    })
})

/*
    /*
    let solutionId = undefined
    let onSolutionComputed = (data:ProjectMgrOutput) => {
        solutionId = data.state.solution.solutionId
    }

    let lastCmd = loadDiscontinuityS1(modules,{onSolutionComputed})    
    lastCmd = addSimpleShape(lastCmd, modules, 'plane xy',{})

    modules.projectMgr.output$.pipe(skip(lastCmd),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the observation mesh is updated => add default Andersonian remote

        expect(data.state.solution.solutionId).toEqual(solutionId)
        let rootNode = data.state.node
        let remoteFolder = findChild<ArcheFolderRemoteNode>(rootNode,ArcheFolderRemoteNode)
        let actions = getActions(data.manager.tree, remoteFolder)
        setTimeout( ()=> actions.find( action => action.name=='add Andersonian stress').exe(), 0)
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+1),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the andersonian remote is added, solution has been discarded

        let rootNode = data.state.node
        let remote = findChild<ArcheAndersonianRemoteNode>(rootNode,ArcheAndersonianRemoteNode)
        expect(remote).toBeDefined()
        expect(data.state.solution).toBeUndefined()        
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+2),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // solution has been updated

        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId != solutionId).toBeTruthy() 
        solutionId = solution.solutionId 
        expect(solution.model.remotes.length == 1)
        expect(solution.model.remotes[0]).toBeInstanceOf(ArcheFacade.AndersonianRemote)
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+3),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // realization has been updated
        
        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId).toEqual(solutionId) 
        let realizationNode = findChild<ArcheRealizationNode>(data.state.node,ArcheRealizationNode)
        data.manager.buildObject3D(realizationNode.id).subscribe( (object3d:KeplerObject3D) => {
        
            let geometry = object3d.geometry as BufferGeometry    
            expect(object3d.dataframe).toBeDefined()
            expect(object3d.dataframe.columns()).toEqual(['stress'])
            let stress = object3d.dataframe.serie('stress')
            expect(stress.values().length).toEqual(geometry.getAttribute('position').count)
            stress.values().forEach( value => expect(value).toEqual([0,0,0,0])) // see line 'modules.mockEnv.send(...)
        })
        let remote = findChild<ArcheFolderRemoteNode>(data.state.node,ArcheAndersonianRemoteNode)
        let newRemote = new ArcheFacade.AndersonianRemote( {HSigma:1, hSigma:2, vSigma:3, theta:4})
        setTimeout( ()=> data.manager.saveNode(remote,newRemote), 0)
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+4),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // the andersonian remote is added, solution has been discarded

        expect(data.state.solution).toBeUndefined()      
        let rootNode = data.state.node
        let remote = findChild<ArcheAndersonianRemoteNode>(rootNode,ArcheAndersonianRemoteNode)
        expect(remote).toBeDefined()
        expect(remote.parameters).toEqual({HSigma:1, hSigma:2, vSigma:3, theta:4})        
    })

    modules.projectMgr.output$.pipe(skip(lastCmd+5),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
        // solution has been updated

        expect(data.state.solution).toBeDefined()  
        let solution = data.state.solution as MockEnvironment.MockSolution
        expect(solution.solutionId != solutionId).toBeTruthy() 
        solutionId = solution.solutionId 
        expect(solution.model.remotes.length == 1)
        expect(solution.model.remotes[0]).toBeInstanceOf(ArcheFacade.AndersonianRemote)    
        expect(solution.model.remotes[0].parameters).toEqual({HSigma:1, hSigma:2, vSigma:3, theta:4})          
    })
    modules.projectMgr.output$.pipe(skip(lastCmd+6),take(1),map(({data})=>data)).subscribe( (data:ProjectMgrOutput) => {
         // realization has been updated

         expect(data.state.solution).toBeDefined()  
         expect(data.state.solution.solutionId).toEqual(solutionId) 
         let realizationNode = findChild<ArcheRealizationNode>(data.state.node,ArcheRealizationNode)
         data.manager.buildObject3D(realizationNode.id).subscribe( (object3d:KeplerObject3D) => {
         
             let geometry = object3d.geometry as BufferGeometry    
             expect(object3d.dataframe).toBeDefined()
             expect(object3d.dataframe.columns()).toEqual(['stress'])
             let stress = object3d.dataframe.serie('stress')
             expect(stress.values().length).toEqual(geometry.getAttribute('position').count)
             stress.values().forEach( value => expect(value).toEqual([1,2,3,4])) // see line 'modules.mockEnv.send(...)
             done()       
         }) 
    })*/