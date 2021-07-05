import { Interfaces } from '@youwol/flux-files'
import { from, Observable, of, Subject } from 'rxjs'
import { filter, map, mergeMap, tap } from 'rxjs/operators'
import { ArcheRealizationNode, ArcheObservationMeshNode, ProcessingType } from './tree-nodes'

import { decodeGocadTS} from '@youwol/io'
import { DataFrame } from '@youwol/dataframe'
import { ArcheFacade } from '../arche.facades'
import * as _ from 'lodash'
import { AUTO_GENERATED} from '../../auto_generated'
import { Environment, Solution } from './data'
import { uuidv4 } from '@youwol/flux-core'


export class LocalSolution implements Solution{
    
        constructor( public readonly worker: Worker, public readonly solutionId: string ){}
    
}

export class WasmWorker{

    fetchWasm() {
        return fetch(`/api/cdn-backend/libraries/youwol/${AUTO_GENERATED.name}/${AUTO_GENERATED.version}/assets/arche.js`)
        .then( d => d.text())
    }
    createWorker(){
        var blob = new Blob(['self.onmessage = ', processArcheTaskInWorker.toString()], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        let worker = new Worker(url)
        worker.onmessage = function ({ data }) {
            LocalEnvironment.workersChannel$.next({taskId:data['taskId'], data})
        }
        return worker;
    }
}

export class LocalEnvironment extends Environment{

    static solutions = new Map<ArcheFacade.Model, LocalSolution>()
    static workersChannel$ = new Subject<{taskId:string, data:any}>()
    

    constructor(
        public readonly drive: Interfaces.Drive, 
        public readonly folder: Interfaces.Folder,
        public readonly wasmWorker =  new WasmWorker()){
        super()
    }

    solve(model: ArcheFacade.Model, notifications$): Observable<LocalSolution>{

        if(LocalEnvironment.solutions.has(model))
            return of(LocalEnvironment.solutions.get(model))
        notifications$.next({type:ProcessingType.Solve, count: 1 })

        let worker = this.wasmWorker.createWorker()
        let taskId = uuidv4()
        
        this.wasmWorker.fetchWasm()
        .then(archeSrcContent => {            
            worker.postMessage({
                task: 'solve',
                taskId,
                data: model,
                archeSrcContent,
                archeFactoryFct: "return " + ArcheFacade.factory.toString(),
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
            mergeMap( (archeSrcContent) => {
                return this.drive.readAsText(meshFileId).pipe( map(content=> {
                    return { 
                        archeSrcContent,
                        mesh: undefined //( content, { collapse: false })[0]
                    }
                }))
            })
        ).subscribe( ({archeSrcContent, mesh}) => { 
            let grid = new Float32Array(new SharedArrayBuffer( 4 * mesh.positions.length))
            grid.set(Float32Array.from(mesh.positions),0)
            let message = {
                task: 'resolve',
                taskId,
                data: {  grid},
                archeSrcContent,
                solutionId:solution.solutionId,
                archeFactoryFct: "return " + ArcheFacade.factory.toString(),
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


export function processArcheTaskInWorker({
        data: { task, taskId, archeSrcContent, data, config, archeFactoryFct, solutionId }
    }:
    { data: { task: string, taskId:string, archeSrcContent: string, config: any, data: ArcheFacade.Model | { solutionId: string, grids: Array<ArrayBuffer> }, 
        archeFactoryFct: string, solutionId: string }
    },
    _GlobalScope = undefined  
    ) {
    console.log("START PROCESS TASK IN WORKER", task, taskId)
    let GlobalScope = _GlobalScope ? _GlobalScope : self as any
    let timings = []
    let messages = []
    if(!GlobalScope.archeSolutions)
        GlobalScope.archeSolutions = {}

    let t0 = performance.now()
    var exports ={}
    
    new Function('document','exports','__dirname', archeSrcContent)( GlobalScope, exports, "")
    let ArcheModule = exports['ArcheModule']

    let t1 = performance.now()
    timings.push({ title: `Parse Arche source`, dt: t1 - t0 })

    let archeFactory = typeof(archeFactoryFct) == 'string' ? new Function(archeFactoryFct)() : archeFactoryFct

    let solve = (data, config, archeFactory, arche) => {
        let model = archeFactory("ArcheModelNode", data, arche, archeFactory )
        let solver = new arche.Solver(model, 'seidel', 1e-9,200)
        solver.run()
        GlobalScope.archeSolutions[solutionId] = model
        console.log("DONE WITH PROCESS TASK INWORKER", task, taskId, solutionId)
        GlobalScope.postMessage({  messages, timings, taskId })
    }

    let resolve = (data) => {
        console.log("Start resolution task", taskId, solutionId, GlobalScope.archeSolutions)
        let model = GlobalScope.archeSolutions[solutionId]
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

    ArcheModule().then( (arche) => {
        let t2 = performance.now()
        timings.push({ title: `Wasm runtime initialized`, dt: t2 - t1 })
        if( task == "solve")
            solve(data, config, archeFactory, arche)
        if( task == "resolve")
            resolve(data)
    })
}

