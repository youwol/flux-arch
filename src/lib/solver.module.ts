


import { pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, Property, 
    Context, ModuleError, expectInstanceOf, expectSingle } from '@youwol/flux-core'
import { ArchFacade } from './arch.facades';
import { filter, map } from 'rxjs/operators';
import { WorkerContext } from '@youwol/flux-core/src/lib/worker-pool';
import { ProgressViewData, ConvergencePlotData } from './views/progress.view';
import { BufferAttribute, BufferGeometry, Group, Object3D } from 'three';
import { DataFrame, Serie } from '@youwol/dataframe';
import { KeplerMesh } from '@youwol/flux-kepler';
import { createFluxThreeObject3D, defaultMaterial } from '@youwol/flux-three';

export namespace ModuleSolver {

    interface WorkerArguments {
        model : ArchFacade.Model
    }

    export function solveInWorker( { args, taskId, context, workerScope }:{
        args: WorkerArguments, 
        taskId: string,
        workerScope: any,
        context: WorkerContext
    }) {
        let arch = workerScope["arch"]

        context.info("Parse model", { model:args })
        let model = workerScope["@youwol/flux-arch.archFactory"]("ArchModelNode", args.model, arch)

        context.info("Create solver")
        let solver = new arch.Solver(
            model, 
            args.model.solver.type, 
            args.model.solver.parameters.tolerance, 
            args.model.solver.parameters.maxIteration
            )

        context.info("Start solver")
        solver.onProgress((a, b, step)=> {
            if(step===1){
                context.info(`Building system: ${b}%`) 
                context.sendData({step:'BuildingStep', progress:b})
            }
            else{
                context.info(`Iteration ${a}: ${b.toExponential(4)}`)
                context.sendData({step:'IteratingStep', iteration:a, residue:b})
            }
        })
        try{
            let solution = solver.run()
            context.info("Solver done") 

            let burgers = solution.burgers(true, true)
            let burgersDisplay = solution.burgers(true, false)

            return {burgers, burgersDisplay}
        }
        catch(e){
            console.error(e) 
            console.log(e)
            throw e
        }
    }


    //Icons made by <a href="https://www.flaticon.com/authors/becris" title="Becris">Becris</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `<path d="m2.08 43.608c.035.44.354.805.786.898l3.485.752c.123.594.279 1.18.468 1.752l-2.638 2.39c-.327.296-.421.772-.231 1.171.482 1.014 1.019 1.951 1.596 2.785.25.362.708.518 1.129.383l3.387-1.091c.405.454.836.885 1.29 1.29l-1.091 3.387c-.135.419.02.878.383 1.129.834.577 1.771 1.114 2.785 1.596.4.19.875.095 1.171-.231l2.39-2.638c.573.188 1.159.345 1.753.468l.752 3.485c.093.431.458.75.897.786.532.042 1.065.08 1.608.08s1.076-.038 1.608-.08c.44-.035.805-.354.898-.786l.752-3.485c.594-.123 1.181-.279 1.753-.468l2.39 2.638c.297.327.773.422 1.171.231 1.014-.482 1.951-1.02 2.785-1.596.363-.251.518-.71.383-1.129l-1.091-3.387c.454-.405.885-.836 1.29-1.289l3.387 1.091c.419.136.878-.02 1.129-.383.577-.834 1.114-1.771 1.596-2.785.19-.399.096-.875-.231-1.171l-2.638-2.39c.188-.573.345-1.159.468-1.753l3.485-.752c.431-.093.75-.458.786-.897.041-.533.079-1.066.079-1.609s-.038-1.076-.08-1.608c-.035-.44-.354-.805-.786-.898l-3.485-.752c-.123-.594-.279-1.181-.468-1.753l2.638-2.39c.327-.296.421-.772.231-1.171-.482-1.014-1.02-1.951-1.596-2.785-.251-.363-.71-.519-1.129-.383l-3.387 1.091c-.405-.454-.836-.885-1.29-1.29l1.091-3.387c.135-.419-.02-.878-.383-1.129-.834-.577-1.771-1.114-2.785-1.596-.4-.191-.875-.096-1.171.231l-2.39 2.638c-.573-.188-1.159-.345-1.753-.468l-.752-3.485c-.093-.431-.458-.75-.897-.786-1.065-.086-2.152-.084-3.217 0-.44.035-.805.354-.898.786l-.752 3.485c-.594.123-1.18.279-1.752.468l-2.39-2.638c-.296-.327-.771-.421-1.171-.231-1.014.482-1.951 1.019-2.785 1.596-.363.251-.518.71-.383 1.129l1.091 3.387c-.454.405-.885.836-1.29 1.29l-3.386-1.091c-.42-.136-.879.02-1.129.383-.577.834-1.114 1.771-1.596 2.785-.19.399-.096.875.231 1.171l2.638 2.39c-.188.573-.345 1.159-.468 1.753l-3.485.752c-.431.093-.75.458-.786.897-.042.533-.08 1.066-.08 1.609s.038 1.076.08 1.608zm1.941-2.317 3.402-.735c.402-.087.71-.411.776-.817.15-.922.392-1.827.719-2.691.146-.384.041-.819-.264-1.095l-2.569-2.328c.224-.429.458-.84.7-1.229l3.296 1.062c.39.125.82 0 1.081-.318.59-.722 1.256-1.387 1.978-1.978.318-.26.445-.689.318-1.081l-1.062-3.296c.389-.243.799-.477 1.229-.7l2.328 2.57c.277.305.713.41 1.096.264.862-.327 1.767-.569 2.69-.719.406-.066.73-.374.817-.776l.734-3.402c.471-.025.95-.026 1.419 0l.735 3.402c.087.402.411.71.817.776.922.15 1.827.392 2.691.719.382.146.818.042 1.095-.264l2.328-2.569c.429.224.84.458 1.229.7l-1.062 3.296c-.126.392 0 .82.318 1.081.722.59 1.387 1.256 1.978 1.978.261.319.69.446 1.081.318l3.296-1.062c.243.389.477.799.7 1.228l-2.57 2.328c-.305.276-.41.711-.264 1.096.327.862.569 1.767.719 2.69.066.406.374.73.776.817l3.402.734c.013.235.022.472.022.71s-.008.475-.021.709l-3.402.735c-.402.087-.71.411-.776.817-.15.922-.392 1.827-.719 2.691-.146.384-.041.819.264 1.095l2.569 2.328c-.224.429-.458.84-.7 1.229l-3.296-1.062c-.393-.128-.82-.001-1.081.318-.589.72-1.255 1.386-1.978 1.978-.318.26-.444.689-.318 1.08l1.062 3.296c-.389.243-.799.477-1.228.7l-2.328-2.57c-.276-.305-.711-.408-1.096-.264-.862.327-1.767.569-2.69.719-.406.066-.73.374-.817.776l-.734 3.402c-.471.025-.95.026-1.419 0l-.735-3.402c-.087-.402-.411-.71-.817-.776-.922-.15-1.827-.392-2.691-.719-.383-.146-.819-.042-1.095.264l-2.328 2.569c-.429-.224-.84-.458-1.229-.7l1.062-3.296c.126-.392 0-.82-.318-1.081-.722-.59-1.387-1.256-1.978-1.978-.261-.319-.691-.445-1.081-.318l-3.296 1.062c-.243-.389-.477-.799-.7-1.229l2.57-2.328c.305-.276.41-.711.264-1.096-.327-.862-.569-1.767-.719-2.69-.066-.406-.374-.73-.776-.817l-3.404-.732c-.012-.235-.021-.472-.021-.71s.008-.475.021-.709z"/><path d="m54.219 16.235c.376-.118.648-.447.693-.839.06-.505.088-.962.088-1.396s-.028-.891-.087-1.396c-.045-.392-.317-.721-.693-.839l-2.773-.871c-.083-.227-.175-.45-.276-.668l1.344-2.575c.182-.349.142-.773-.102-1.083-.579-.732-1.245-1.398-1.979-1.979-.31-.245-.734-.284-1.083-.103l-2.577 1.344c-.218-.1-.441-.192-.668-.275l-.871-2.773c-.118-.376-.447-.648-.839-.693-1.012-.118-1.781-.118-2.793 0-.392.045-.721.317-.839.693l-.871 2.773c-.227.083-.45.175-.668.276l-2.575-1.344c-.349-.181-.772-.142-1.083.102-.732.579-1.398 1.245-1.979 1.979-.245.31-.285.733-.103 1.083l1.343 2.575c-.1.218-.192.441-.275.668l-2.773.871c-.376.118-.648.447-.693.839-.059.505-.087.962-.087 1.396s.028.891.087 1.396c.045.392.317.721.693.839l2.773.871c.083.227.175.45.276.668l-1.344 2.575c-.182.349-.142.773.102 1.083.579.732 1.245 1.398 1.979 1.979.309.245.734.284 1.083.103l2.575-1.343c.218.1.441.192.668.275l.871 2.773c.118.376.447.648.839.693.507.06.964.088 1.398.088s.891-.028 1.396-.087c.392-.045.721-.317.839-.693l.871-2.773c.227-.083.45-.175.668-.276l2.575 1.344c.349.182.773.143 1.083-.102.732-.579 1.398-1.245 1.979-1.979.245-.31.285-.733.103-1.083l-1.344-2.575c.101-.218.193-.441.276-.668zm-3.86-.884c-.316.1-.562.349-.658.667-.136.452-.316.887-.534 1.294-.157.292-.16.643-.006.936l1.269 2.432c-.237.263-.488.514-.75.75l-2.432-1.269c-.294-.154-.645-.15-.936.006-.407.218-.842.398-1.294.534-.317.095-.567.342-.667.658l-.824 2.624c-.365.022-.688.022-1.054 0l-.824-2.624c-.1-.316-.349-.562-.667-.658-.453-.136-.888-.316-1.293-.534-.292-.157-.643-.16-.937-.006l-2.432 1.269c-.263-.237-.514-.488-.75-.75l1.269-2.432c.153-.293.151-.645-.006-.936-.218-.407-.398-.842-.534-1.294-.095-.317-.342-.567-.658-.667l-2.624-.824c-.012-.183-.017-.358-.017-.527s.005-.344.017-.527l2.624-.824c.316-.1.562-.349.658-.667.136-.453.316-.888.534-1.293.157-.292.16-.643.006-.937l-1.269-2.432c.237-.263.488-.514.75-.75l2.432 1.269c.293.153.645.15.936-.006.407-.218.842-.398 1.294-.534.317-.095.567-.342.667-.658l.824-2.624c.365-.022.688-.022 1.054 0l.824 2.624c.1.316.349.562.667.658.453.136.888.316 1.293.534.292.157.643.16.937.006l2.432-1.269c.263.237.514.488.75.75l-1.269 2.432c-.153.293-.151.645.006.936.218.407.398.842.534 1.294.095.317.342.567.658.667l2.624.824c.012.183.017.358.017.527s-.005.344-.017.527z"/><path d="m61.262 34.964-1.718-.61c-.098-.279-.21-.552-.337-.817l.781-1.645c.163-.342.118-.746-.116-1.044-.5-.639-1.078-1.218-1.719-1.72-.299-.234-.705-.278-1.045-.116l-1.646.781c-.264-.126-.537-.239-.816-.336l-.611-1.718c-.127-.357-.446-.612-.822-.658-.891-.107-1.536-.107-2.427 0-.376.045-.695.3-.822.658l-.61 1.718c-.279.098-.552.21-.817.337l-1.645-.781c-.34-.162-.745-.117-1.044.116-.639.5-1.218 1.078-1.72 1.719-.233.298-.278.703-.116 1.045l.781 1.646c-.126.264-.239.537-.336.816l-1.718.611c-.357.127-.612.446-.658.822-.055.443-.081.84-.081 1.212s.026.768.08 1.213c.045.376.3.695.658.822l1.718.61c.098.279.21.552.337.817l-.781 1.645c-.163.342-.118.746.116 1.044.5.639 1.078 1.218 1.719 1.72.298.233.704.278 1.045.116l1.646-.781c.264.126.537.239.816.336l.611 1.718c.127.357.446.612.822.658.445.056.841.082 1.213.082s.768-.026 1.213-.08c.376-.045.695-.3.822-.658l.61-1.718c.279-.098.552-.21.817-.337l1.645.781c.341.163.747.119 1.044-.116.639-.5 1.218-1.078 1.72-1.719.233-.298.278-.703.116-1.045l-.781-1.646c.126-.264.239-.537.336-.816l1.718-.611c.357-.127.612-.446.658-.822.056-.445.082-.841.082-1.213s-.026-.768-.08-1.213c-.045-.377-.3-.695-.658-.823zm-1.272 2.401-1.585.563c-.307.109-.542.361-.629.675-.131.475-.318.928-.555 1.347-.16.283-.172.627-.033.921l.718 1.513c-.166.182-.34.356-.521.521l-1.513-.718c-.292-.139-.637-.127-.921.033-.42.238-.873.424-1.346.555-.314.087-.566.322-.676.629l-.563 1.585c-.242.013-.488.013-.73 0l-.563-1.585c-.109-.307-.361-.542-.675-.629-.475-.131-.928-.318-1.347-.555-.283-.159-.626-.171-.921-.033l-1.513.718c-.182-.166-.356-.34-.521-.521l.718-1.513c.14-.294.127-.638-.033-.921-.238-.42-.424-.873-.555-1.346-.087-.314-.322-.566-.629-.676l-1.585-.563c-.008-.121-.012-.242-.012-.365s.004-.245.01-.365l1.585-.564c.307-.109.542-.361.628-.675.132-.476.319-.928.556-1.347.16-.283.172-.627.033-.921l-.718-1.513c.166-.182.34-.356.521-.521l1.513.718c.294.14.638.128.921-.033.42-.238.873-.424 1.346-.555.314-.087.566-.322.676-.629l.563-1.585c.242-.013.488-.013.73 0l.563 1.585c.109.307.361.542.675.629.475.131.928.318 1.347.555.284.161.627.173.921.033l1.513-.718c.182.166.356.34.521.521l-.718 1.513c-.14.294-.127.638.033.921.238.42.424.873.555 1.346.087.314.322.566.629.676l1.585.563c.008.122.012.243.012.366s-.004.244-.01.365z"/><path d="m22 53c6.065 0 11-4.935 11-11s-4.935-11-11-11-11 4.935-11 11 4.935 11 11 11zm0-20c4.962 0 9 4.038 9 9s-4.038 9-9 9-9-4.038-9-9 4.038-9 9-9z"/><path d="m2.022 25.359 1.536 1.281c4.579-5.491 11.3-8.64 18.442-8.64.509 0 1.017.029 1.525.061l-1.232 1.232 1.414 1.414 3-3c.391-.391.391-1.023 0-1.414l-3-3-1.414 1.414 1.359 1.359c-.55-.035-1.101-.066-1.652-.066-7.736 0-15.018 3.411-19.978 9.359z"/><path d="m43 9c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"/><path d="m52 33c-2.206 0-4 1.794-4 4s1.794 4 4 4 4-1.794 4-4-1.794-4-4-4zm0 6c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z"/><path d="m61.196 5.02-5-1c-.544-.11-1.069.243-1.177.784l-1 5 1.961.393.539-2.692c.969 2.016 1.481 4.238 1.481 6.495 0 3.448-1.138 6.69-3.29 9.375l1.561 1.251c2.405-3.001 3.729-6.774 3.729-10.626 0-2.619-.605-5.201-1.756-7.531l2.56.512z"/>`

    @Schema({
        pack: pack,
        description: "Persistent Data of Solver"
    })
    export class PersistentData {

        @Property({ description: "Solver type", enum: ["seidel"] })
        readonly type: string = 'seidel'

        @Property({ description: "Maximum iteration" })
        readonly maxIteration: number = 200

        @Property({ description: "Tolerance" })
        readonly tolerance: number = 1e-9

        @Property({ description: "Id of the object3D created that represents displacements" })
        readonly burgersObjectId: string = "burgersObject3D"

        getSolver(){
            return new ArchFacade.Solver( 
                this.type, 
                { maxIteration: this.maxIteration, tolerance: this.tolerance }
                )
        }
        constructor(params: { type?: string, maxIteration?: number, tolerance?: number } = {}) {

            Object.assign(this, params)
        }
    }

    let contractScene = expectSingle({
        when: expectInstanceOf({
            typeName: "Scene",
            Type: ArchFacade.Scene
        })
    })

    @Flux({
        pack: pack,
        namespace: ModuleSolver,
        id: "ModuleSolver",
        displayName: "Solver",
        description: "Arch solver"
    })
    @BuilderView({
        namespace: ModuleSolver,
        icon: svgIcon
    })
    export class Module extends ModuleFlux {

        solution$: Pipe<any>

        constructor(params) {
            super(params)

            this.addInput({
                id: "input",
                description: `Triggering this input execute the solver using the provided scene.`,
                contract: contractScene,
                onTriggered: ({ data, configuration, context }) => this.solveMultiThreaded(data, configuration, context)
            })
            this.solution$ = this.addOutput({ id: "solution" })
        }

        solveMultiThreaded(scene: ArchFacade.Scene, configuration: PersistentData, context: Context) {

            let workerPool = this.environment.workerPool
            let model = new ArchFacade.Model({
                surfaces: scene.surfaces,
                material: scene.material,
                remotes: scene.remotes,
                solver: configuration.getSolver()
            })
            let channel$ = workerPool.schedule<WorkerArguments>({
                title: 'SOLVE',
                entryPoint: solveInWorker,
                args:{ 
                    model
                },
                context
            })

            let buildingProgress$ = channel$.pipe( 
                filter( ({type, data}) => type == "Data" && data.step == "BuildingStep"),
                map( ({data}) => data.progress)
            )
            let convergenceProgress$ = channel$.pipe( 
                filter( ({type, data}) => type == "Data" && data.step == "IteratingStep"),
                map( ({data}) => data)
            )
            let buildingPlot = new ProgressViewData(buildingProgress$)
            context.info("Building system progress", buildingPlot)

            let convergencePlot = new ConvergencePlotData(convergenceProgress$,configuration.tolerance, configuration.maxIteration,
                this.environment)
            context.info("Convergence progress", convergencePlot)

            channel$.pipe( 
                filter( ({type}) => type == "Exit")
            ).subscribe( 
                ({data}) => {
                    context.info("Result retrieved", data.result)
                    this.solution$.next({ 
                        data: { 
                            solution: new ArchFacade.Solution(model, data.result.burgers),
                            burgersObject3D: this.createBurgersObjects(scene, data.result.burgersDisplay,configuration, context)
                        }, 
                        context 
                    })
                    context.terminate()
                },
                (error) => { 
                    context.error(new ModuleError(this, error.message))
                    context.terminate()
                }
            )
        }


        createBurgersObjects(
            scene:ArchFacade.Scene, 
            results: Array<ArrayBuffer>, 
            configuration: PersistentData,
            context: Context ): Object3D {
            
            return context.withChild("Create 3D objects of discontinuities displacement", (ctx) => {

                let keplerObjects = scene.surfaces.map( (surface, i) => {
                    let geometry = new BufferGeometry()
                    let positions = new BufferAttribute(surface.positions,3)
                    geometry.setAttribute('position',positions)
                    geometry.setIndex(new BufferAttribute(surface.indexes,1))
                    let array = new Float64Array(results[i])
                    let df = DataFrame.create({
                        series:{ 
                            burgers: Serie.create({
                                array,
                                itemSize:3 
                            })
                        }
                    })
                    let keplerMesh = new KeplerMesh(geometry, defaultMaterial(), df)
                    let obj = createFluxThreeObject3D({
                        object: keplerMesh,
                        id:`${configuration.burgersObjectId}_${i}`,
                        displayName:`${configuration.burgersObjectId}_${i}`
                    })
                    return obj
                })
                let group = new Group()
                group.add(...keplerObjects)
                let obj = createFluxThreeObject3D({
                    object: group,
                    id: configuration.burgersObjectId,
                    displayName: configuration.burgersObjectId
                }) as Group
                return obj
            })
        }
    }
}

