import { FluxPack, IEnvironment, Journal } from '@youwol/flux-core'
import { Observable } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { AUTO_GENERATED } from '../auto_generated'
import { ArchFacade } from './arche.facades';
import { progressView, ProgressViewData, ConvergencePlotData, convergencePlotViewD3 } from './views/progress.view';
export var arche 


export function install(environment: IEnvironment){
    
    let resource = `${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/arch.js`
    let loadWasm = environment.fetchJavascriptAddOn(`${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/arch.js`)
    .pipe(
        tap( (assets) => {
            environment.workerPool.import({
                sources: [{
                    id: resource,
                    src: assets[0].src,
                    sideEffects: (workerScope, exports) => {
                        return exports.ArchModule().then( (arche) => { 
                            console.log("WASM Arch installed", arche)
                            workerScope.arche = arche
                        })
                    }
                }],
                functions: [{
                    id: "@youwol/flux-arche.archeFactory",
                    target: ArchFacade.factory
                }],
                variables: []
            })
        }),
        mergeMap( (assets) => {
            return new Observable(subscriber => {
                window["ArchModule"]().then( archeMdle => { 
                    arche = archeMdle; 
                    subscriber.next(true); subscriber.complete(); })
            });
        })
    )

    Journal.registerView({
        name:'ConvergencePlot @ flux-arch',
        description:"Journal view to display live solver's convergence progress",
        isCompatible: (data:unknown) => {
            return data instanceof ConvergencePlotData
        },
        view: (data: ConvergencePlotData) => {
            return convergencePlotViewD3(data) as any
        }
    })
    Journal.registerView({
        name:'BuildingSystemView @ flux-arch',
        description:'Journal view to display live building system progress',
        isCompatible: (data:unknown) => {
            return data instanceof ProgressViewData
        },
        view: (data: ProgressViewData) => {
            return progressView(data) as any
        }
    })

    return loadWasm
}

export let pack = new FluxPack({
    ...AUTO_GENERATED,
    ...{
        install
    }
})

