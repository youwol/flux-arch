import { Context, uuidv4 } from "@youwol/flux-core"
import { Observable, of, ReplaySubject, Subject } from "rxjs"
import { filter, map, reduce, switchMap, take } from "rxjs/operators"
import { CubeTexture } from "three"

interface WorkerMessage{

    type: string
    data: any
}


function entryPointWorker(messageEvent: MessageEvent){
    let message = messageEvent.data
    console.log("Execute action in worker", message)
    let workerScope : any = self
    if(message.type == "Execute"){

        let context = {
            info: (text, json) => {
                workerScope.postMessage({  
                    type:"Log" , 
                    data: {
                        taskId: message.data.taskId,
                        logLevel: "info",
                        text,
                        json: json
                    }
                })
            }
        }
        
        let entryPoint = new Function(message.data.entryPoint)()
        
        workerScope.postMessage({  
            type:"Start" , 
            data: {
                taskId: message.data.taskId
            }
        })
        let result = entryPoint( {
            args: message.data.args, 
            taskId: message.data.taskId,
            workerScope: workerScope,
            context
        })

        workerScope.postMessage({  
            type:"Exit" , 
            data: {
                taskId: message.data.taskId,
                error: false,
                result: result
            }
        })
    }
    if(message.type == "installScript"){
        //let GlobalScope = _GlobalScope ? _GlobalScope : self as any
        let GlobalScope = self
        var exports = {}
        console.log(`Installing ${message.data.scriptId}`, message)
        if(!message.data.import){
            console.log(`Installing ${message.data.scriptId} using default import`)
            workerScope.postMessage({  
                type:"Log" , 
                data: {
                    logLevel: "info",
                    text: `Installing ${message.data.scriptId} using default import`
                }
            }) 
            new Function('document','exports','__dirname', message.data.src )( GlobalScope, exports, "")
            console.log("exports", exports)
        }
        else{
            workerScope.postMessage({  
                type:"Log" , 
                data: {
                    logLevel: "info",
                    text: `Installing ${message.data.scriptId} using provided import function: ${message.data.import}`
                }
            })
            let importFunction = new Function(message.data.import)()
            importFunction(GlobalScope, message.data.src)
        }
        workerScope.postMessage({  
            type:"Log" , 
            data: {
                logLevel: "info",
                text: `Installing ${message.data.scriptId} using provided import function: ${message.data.import}`
            }
        }) 

        if(message.data.sideEffects){
            let sideEffectFunction = new Function(message.data.sideEffects)()
            let promise = sideEffectFunction(GlobalScope, exports)
            promise.then( () => {
                workerScope.postMessage({  
                    type:"DependencyInstalled" , 
                    data: {
                        scriptId: message.data.scriptId
                    }
                })
            })
        }else{
            workerScope.postMessage({  
                type:"DependencyInstalled" , 
                data: {
                    scriptId: message.data.scriptId
                }
            })
        }
    }
}

type WorkerId = string

interface Dependency{
    src: string | HTMLScriptElement
    import?: (GlobalScope, src) => void,
    sideEffects?: (globalScope, exports) => void
}

export class WorkerPool{

    static poolSize = navigator.hardwareConcurrency-2

    static workers : {[key:string]: Worker}= {}
    static channels$ : {[key:string]: Subject<any> } = {}

    static tasksQueue : {[key:string]: Array<{taskId:string, args: unknown, entryPoint: any}>}= {}
    static runningTasks: Array<{workerId: string, taskId:string}>= []
    static busyWorkers : Array<string> = []

    static dependencies : {[key:string]: Dependency } = {}

    static workerReleased$ = new Subject<{workerId:WorkerId, taskId: string}>()

    static backgroundContext = new Context("background management", {})

    static subs = WorkerPool.workerReleased$.subscribe( ({workerId, taskId}) => {

        WorkerPool.busyWorkers = WorkerPool.busyWorkers.filter( (wId) => wId!=workerId)
        WorkerPool.runningTasks = WorkerPool.runningTasks.filter( (task) => task.taskId != taskId)
        WorkerPool.pickTask(workerId, WorkerPool.backgroundContext)
    })

    static import( {sources} : { 
        sources: { 
            [key:string] : Dependency
        }
    }){
        WorkerPool.dependencies = {...WorkerPool.dependencies, ...sources}
    }


    static schedule({entryPoint, args, targetWorkerId, context}: { 
        entryPoint: (parameters) => void,
        args: unknown,
        targetWorkerId?: string,
        context: Context
    } ): Observable<any> {

        return context.withChild( "schedule thread", (ctx) => {
            
            let taskId = uuidv4()
            if( targetWorkerId && !WorkerPool.workers[targetWorkerId]){
                throw Error("Provided workerId not known")
            }
            if(targetWorkerId && WorkerPool.workers[targetWorkerId]){
                WorkerPool.tasksQueue[targetWorkerId].push( 
                    {
                        entryPoint,
                        args,
                        taskId
                    }
                )

                if( !WorkerPool.busyWorkers.includes(targetWorkerId)){
                    WorkerPool.pickTask(targetWorkerId, ctx)
                }
                
                return WorkerPool.channels$[targetWorkerId].pipe( 
                    filter( (message) => message.data.taskId == taskId)
                )
            }
            let {workerId, worker$} = WorkerPool.getWorker$(ctx)
            worker$.pipe(
                map( (worker) => {
                    ctx.info("Got a worker ready")
                    WorkerPool.tasksQueue[workerId].push( 
                        {
                            entryPoint,
                            args,
                            taskId
                        }
                    )
                    WorkerPool.pickTask(workerId, ctx)
                    return workerId
                }))
            .subscribe()
            
            WorkerPool.channels$[workerId].pipe(
                filter( (message) => { 
                    return (message.type == "Exit" || message.type == "Start") && message.data.taskId == taskId
                }),
                take(2)
            ).subscribe( (message) => {
                message.type == "Start" 
                    ? context.info("worker started", message)
                    : context.info("worker done", message)
            })

            WorkerPool.channels$[workerId].pipe(
                filter( (message) => { 
                    return message.type == "Log" && message.data.taskId == taskId
                })
            ).subscribe( (message) => {
                context.info(message.data.text, message.data.json)
            })

            return WorkerPool.channels$[workerId].pipe( 
                filter( (message) =>{
                return message.data.taskId && message.data.taskId == taskId 
                })
            )
        })
        
    }

    static getWorker$(context: Context) : {workerId: string, worker$: Observable<Worker> } {

        return context.withChild("get worker", (ctx) => {
            
            let idleWorkerId = Object.keys(WorkerPool.workers).find( workerId => !WorkerPool.busyWorkers.includes(workerId) )

            if(idleWorkerId){
                ctx.info("return idle worker")
                return { workerId: idleWorkerId, worker$: of(WorkerPool.workers[idleWorkerId])}
            }
            if(Object.keys(WorkerPool.workers).length < WorkerPool.poolSize){

                return WorkerPool.createWorker$(ctx)
            }
        })
    }

    static createWorker$(context: Context):{workerId: string, worker$: Observable<Worker> }{

        return context.withChild("create worker", (ctx) => {
            
            let workerId = uuidv4()
            WorkerPool.channels$[workerId] = new Subject()
            WorkerPool.tasksQueue[workerId] = []

            WorkerPool.channels$[workerId].pipe(
                filter( (message) => { 
                    return message.type == "Exit"
                })
            ).subscribe( (message) => {
                WorkerPool.workerReleased$.next({taskId:message.data.taskId, workerId})
            })

            var blob = new Blob(['self.onmessage = ', entryPointWorker.toString()], { type: 'text/javascript' });
            var url = URL.createObjectURL(blob);
            let worker = new Worker(url)
            worker.onmessage = function ({ data }) {
                WorkerPool.channels$[workerId].next(data)
            }
            WorkerPool.workers[workerId] = worker
            Object.entries(WorkerPool.dependencies).forEach( ([key,dependency]) => {
                worker.postMessage({
                    type: "installScript",
                    data:{
                        src:dependency.src,
                        scriptId: key,
                        import: dependency.import ? `return ${String(dependency.import)}` : undefined,
                        sideEffects: dependency.sideEffects ? `return ${String(dependency.sideEffects)}` : undefined
                    }
                })
            })
            let dependencyCount = Object.keys(WorkerPool.dependencies).length
            if( dependencyCount == 0 ){
                ctx.info("No dependencies to load: worker ready",{workerId: workerId, worker})
                return { workerId, worker$: of(worker) }
            }
            let worker$ = WorkerPool.channels$[workerId].pipe(
                filter( (message) => message.type == "DependencyInstalled"),
                take(dependencyCount),
                reduce( (acc,e) => { acc.concat[e]}, []),
                map( () => worker )
            )
            return {workerId, worker$}
        })
    }

    /**
     * Start a worker with first task in its queue
     */
    static pickTask(workerId: string, context: Context) {

        context.withChild("pickTask", (ctx) => {

            if(WorkerPool.tasksQueue[workerId].length == 0 ){
                ctx.info("No task to pick")
                return
            }
            WorkerPool.busyWorkers.push(workerId)
            let {taskId, entryPoint, args} = WorkerPool.tasksQueue[workerId][0]
            WorkerPool.tasksQueue[workerId].shift()
            WorkerPool.runningTasks.push({workerId, taskId})
            let worker = WorkerPool.workers[workerId]
            
            ctx.info("picked task",{taskId, worker, entryPoint: String(entryPoint)}  )
            worker.postMessage({
                type:"Execute",
                data:{
                    taskId,
                    args,
                    entryPoint: `return ${String(entryPoint)}`
                }
            })
        })
    }
}