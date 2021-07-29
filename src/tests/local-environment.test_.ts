//import { MockDriveImplementation } from '../../../shared/test/mock-drive'
import { Interfaces } from '@youwol/flux-files'
import { LocalEnvironment, processArchTaskInWorker } from '../lib/implementation/local-environment'
import { ArchFacade } from '../lib/arch.facades'
import * as fs from 'fs'

import { Subject } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
//import { decodeDataFrame } from '@youwol/flux-pack-dataframe'


console.log = () => {}
//jest.setTimeout(100000)

export class SerialWorker{
    
    GlobalScopeMock = {
        postMessage: (data) => {
        LocalEnvironment.workersChannel$.next({taskId:data['taskId'], data})
    }}

    postMessage({task, taskId, data, config,solutionId,archSrcContent}) {
        processArchTaskInWorker({data:{
            task,
            taskId, 
            archSrcContent, 
            data,
            config,
            archFactoryFct: ArchFacade.factory as any,
            solutionId
            }},
            this.GlobalScopeMock
        )
    }
    onmessage(data){
        LocalEnvironment.workersChannel$.next({taskId:data['taskId'], data})
    }
}
export class SerialWasmWorker{

    fetchWasm() {
        return new Promise( (resolve, reject) => {
            fs.readFile(__dirname+"/../../assets/arch.js",'utf-8', (err, archSrcContent) => {
                resolve(archSrcContent)
            })
        })
    }

    createWorker(){
        return new SerialWorker()
    }
}

function createEnvironment() {
    let mockDrive = undefined // new MockDriveImplementation.Drive("mockDrive", __dirname+"/test-drive")
    let folder = new Interfaces.Folder("","","test-drive",mockDrive)
    return new LocalEnvironment(mockDrive, folder, new SerialWasmWorker() as any)
}

function createSharedArrays(positions, indexes){

    let sharedPositions = new Float32Array(new SharedArrayBuffer( 4 * positions.length))
    sharedPositions.set(Float32Array.from(positions),0)
    let sharedIndexes = new Uint16Array(new SharedArrayBuffer( 2 * indexes.length))
    sharedIndexes.set(Uint16Array.from(indexes),0)
    return [sharedPositions, sharedIndexes]
}

test('simplest model', (done) => {
    
    let env = createEnvironment()
    let [sharedPositions, sharedIndexes] = createSharedArrays([0,0,0, 1,0,0, 1,1,0], [0,1,2])
    
    let constraints = [
        //{ type:'ArchCoulombConstraintNode', parameters:{friction:0, cohesion:0} },
        //{ type:'ArchCoulombOrthoConstraintNode', parameters:{theta: 0, frictionDip:0, frictionStrike:0} },
    ]
    let remotes =[
        //{ type: 'ArchAndersonianRemoteNode', parameters:{ hSigma:0, HSigma:0, vSigma:0, theta:0}} 
    ]
    let surface = {
        positions:sharedPositions, 
        indexes: sharedIndexes, 
        constraints
    }
    let model = {
        surfaces:[surface],
        material: { parameters:{poisson:0.25, young:1, density:1000}},
        remotes
    }
    let notifications$ = new Subject()
    env.solve(model as any, notifications$ ).pipe(
        mergeMap( (solution) => {
            return env.resolve(solution,'testProjectId','testLocalEnvResolve','testLocalEnvResolve.ts',notifications$)
        }),
        mergeMap( (file) => {
            return file.readAsText()
        }),
    ).subscribe( (fileContent) => {
        /*let df = decodeDataFrame(fileContent)
        expect(df.serie('stress').values()).toEqual([[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]])
        */
        done()
    })
})


test('realistic model', (done) => {
    
    let env = createEnvironment()
    let [sharedPositions, sharedIndexes] = createSharedArrays([0,0,0, 1,0,0, 1,1,0], [0,1,2])
    
    let boundaryCondition = new ArchFacade.BoundaryCondition({
        dipAxis:{type:'free', field: (x,y,z) => 0},
        strikeAxis:{type:'free', field:(x,y,z) => 0},
        normalAxis:{type:'free', field:(x,y,z) => 0},
    })
    let constraints = [
        { type:'ArchCoulombConstraintNode', parameters:{friction:0, cohesion:0} },
        { type:'ArchCoulombOrthoConstraintNode', parameters:{theta: 0, frictionDip:0, frictionStrike:0} },
    ]
    let remotes =[
        { type: 'ArchAndersonianRemoteNode', parameters:{ hSigma:0, HSigma:0, vSigma:0, theta:0}} 
    ]
    let surface = {
        positions:sharedPositions, 
        indexes: sharedIndexes, 
        boundaryCondition, 
        constraints
    }
    let model = {
        surfaces:[surface],
        material: { parameters:{poisson:0.25, young:1, density:1000}},
        remotes
    }
    let notifications$ = new Subject()
    env.solve(model as any, notifications$ ).pipe(
        mergeMap( (solution) => {
            return env.resolve(solution,'testProjectId','testLocalEnvResolve','testLocalEnvResolve.ts',notifications$)
        }),
        mergeMap( (file) => {
            return file.readAsText()
        }),
    ).subscribe( (fileContent) => {
        //let df = decodeDataFrame(fileContent)
        //expect(df.serie('stress').values()).toEqual([[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]])
        done()
    })
})

