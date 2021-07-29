import { Interfaces } from '@youwol/flux-files'
import { from, Observable, of, Subject } from 'rxjs'
import { filter, map, mergeMap, tap } from 'rxjs/operators'
import { ArchRealizationNode, ArchObservationMeshNode, ProcessingType } from './tree-nodes'

import { decodeGocadTS} from '@youwol/io'
import { DataFrame } from '@youwol/dataframe'
import { ArchFacade } from '../arch.facades'
import * as _ from 'lodash'
import { AUTO_GENERATED} from '../../auto_generated'
import { Environment, Solution } from './data'
import { uuidv4 } from '@youwol/flux-core'


export class LocalSolution implements Solution{
    
        constructor( public readonly worker: Worker, public readonly solutionId: string ){}
    
}

export class WasmWorker{

    fetchWasm() {
        return fetch(`/api/cdn-backend/libraries/youwol/${AUTO_GENERATED.name}/${AUTO_GENERATED.version}/assets/arch.js`)
        .then( d => d.text())
    }
    createWorker(){
        var blob = new Blob(['self.onmessage = ', processArchTaskInWorker.toString()], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        let worker = new Worker(url)
        worker.onmessage = function ({ data }) {
            LocalEnvironment.workersChannel$.next({taskId:data['taskId'], data})
        }
        return worker;
    }
}

export class LocalEnvironment extends Environment{

    static solutions = new Map<ArchFacade.Model, LocalSolution>()
    static workersChannel$ = new Subject<{taskId:string, data:any}>()
    

    constructor(
        public readonly drive: Interfaces.Drive, 
        public readonly folder: Interfaces.Folder,
        public readonly wasmWorker =  new WasmWorker()){
        super()
    }

    solve(model: ArchFacade.Model, notifications$): Observable<LocalSolution>{

        if(LocalEnvironment.solutions.has(model))
            return of(LocalEnvironment.solutions.get(model))
        notifications$.next({type:ProcessingType.Solve, count: 1 })

        let worker = this.wasmWorker.createWorker()
        let taskId = uuidv4()
        
        this.wasmWorker.fetchWasm()
        .then(archSrcContent => {            
            worker.postMessage({
                task: 'solve',
                taskId,
                data: model,
                archSrcContent,
                archFactoryFct: "return " + ArchFacade.factory.toString(),
                solutionId: taskId
            }) 
        })

        return LocalEnvironment.workersChannel$.pipe(
            filter( d => { 
                return d['taskId'] == taskId
            }),
            map( d => new LocalSolution(worker, taskId) ),
            tap( solution => {
                LocalEnvironment.solutions.set(model, solution)                
                notifications$.next({type:ProcessingType.Solve, count: -1 })
            })
        )
    }

    resolve(solution: LocalSolution, projectId: string, meshId: string, meshFileId: string, notifications$): 
        Observable<Interfaces.File>{
        
        let worker = solution.worker
        let taskId = uuidv4()
        
        notifications$.next({type:ProcessingType.Resolve, id: meshId, count: 1 })
        console.log("##### Start resolve task", meshId)
        from(this.wasmWorker.fetchWasm()).pipe(
            //mergeMap( d => from(d.text())),
            mergeMap( (archSrcContent) => {
                return this.drive.readAsText(meshFileId).pipe( map(content=> {
                    return { 
                        archSrcContent,
                        mesh: undefined //( content, { collapse: false })[0]
                    }
                }))
            })
        ).subscribe( ({archSrcContent, mesh}) => { 
            let grid = new Float32Array(new SharedArrayBuffer( 4 * mesh.positions.length))
            grid.set(Float32Array.from(mesh.positions),0)
            let message = {
                task: 'resolve',
                taskId,
                data: {  grid},
                archSrcContent,
                solutionId:solution.solutionId,
                archFactoryFct: "return " + ArchFacade.factory.toString(),
            }
            console.log("MESSAGE",message)
            worker.postMessage(message)
        })
        
        /*return LocalEnvironment.workersChannel$.pipe(
            filter( d => d['taskId'] == taskId),
            map( d => d.data),
            map( ({ stress, taskId, messages, timings }) =>{
                let d = _.chunk(Array.from(stress), 6)
                return new DataFrame({stress:d})
            }),
            map ( (df:DataFrame) => encodeDataFrame(df)),
            mergeMap( (content) => {
                let fileName = meshId+"-realization-"+solution.solutionId
                return this.drive.createFile(this.folder.id, fileName,new Blob([content]))
            }),
            tap( () => {    
                console.log("##### Done resolve task", meshId)
                notifications$.next({type:ProcessingType.Resolve, id: meshId, count: -1 })
            })            
        )*/
        return undefined
    }
}


export function processArchTaskInWorker({
        data: { task, taskId, archSrcContent, data, config, archFactoryFct, solutionId }
    }:
    { data: { task: string, taskId:string, archSrcContent: string, config: any, data: ArchFacade.Model | { solutionId: string, grids: Array<ArrayBuffer> }, 
        archFactoryFct: string, solutionId: string }
    },
    _GlobalScope = undefined  
    ) {
    console.log("START PROCESS TASK IN WORKER", task, taskId)
    let GlobalScope = _GlobalScope ? _GlobalScope : self as any
    let timings = []
    let messages = []
    if(!GlobalScope.archSolutions)
        GlobalScope.archSolutions = {}

    let t0 = performance.now()
    var exports ={}
    
    new Function('document','exports','__dirname', archSrcContent)( GlobalScope, exports, "")
    let ArchModule = exports['ArchModule']

    let t1 = performance.now()
    timings.push({ title: `Parse Arch source`, dt: t1 - t0 })

    let archFactory = typeof(archFactoryFct) == 'string' ? new Function(archFactoryFct)() : archFactoryFct

    let solve = (data, config, archFactory, arch) => {
        let model = archFactory("ArchModelNode", data, arch, archFactory )
        let solver = new arch.Solver(model, 'seidel', 1e-9,200)
        solver.run()
        GlobalScope.archSolutions[solutionId] = model
        console.log("DONE WITH PROCESS TASK INWORKER", task, taskId, solutionId)
        GlobalScope.postMessage({  messages, timings, taskId })
    }

    let resolve = (data) => {
        console.log("Start resolution task", taskId, solutionId, GlobalScope.archSolutions)
        let model = GlobalScope.archSolutions[solutionId]
        let ptCount = data.grid.length / 3
        let gridResult = new Float32Array( 6 * ptCount )
        for(let i=0;i<ptCount;i++){
            let stress = model.stressAt(data.grid[3*i],data.grid[3*i+1],data.grid[3*i+2])
            stress.forEach( (v,j) => {
                gridResult[6*i + j] = v 
            })
        }
        console.log("DONE WITH PROCESS TASK INWORKER", task, taskId)
        GlobalScope.postMessage({  stress:gridResult , taskId, messages, timings }, gridResult.buffer)
    }

    ArchModule().then( (arch) => {
        let t2 = performance.now()
        timings.push({ title: `Wasm runtime initialized`, dt: t2 - t1 })
        if( task == "solve")
            solve(data, config, archFactory, arch)
        if( task == "resolve")
            resolve(data)
    })
}

