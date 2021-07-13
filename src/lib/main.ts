import { FluxPack, IEnvironment } from '@youwol/flux-core'
import { Observable } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { AUTO_GENERATED } from '../auto_generated'
import { ArcheFacade } from './arche.facades';
export var arche 


export function install(environment: IEnvironment){
    
    let resource = `${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/arche.js`
    let loadWasm = environment.fetchJavascriptAddOn(`${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/arche.js`)
    .pipe(
        tap( (assets) => {
            environment.workerPool.import({
                sources: [{
                    id: resource,
                    src: assets[0].src,
                    sideEffects: (workerScope, exports) => {
                        return exports.ArcheModule().then( (arche) => { 
                            console.log("WASM Arche installed", arche)
                            workerScope.arche = arche
                        })
                    }
                }],
                functions: [{
                    id: "@youwol/flux-arche.archeFactory",
                    target: ArcheFacade.factory
                }]
            })
        }),
        mergeMap( (assets) => {
            return new Observable(subscriber => {
                window["ArcheModule"]().then( archeMdle => { 
                    arche = archeMdle; 
                    subscriber.next(true); subscriber.complete(); })
            });
        })
    )

    /*return forkJoin( [
        Backend.fetchRenderViewCss( {href:`/api/cdn-backend/libraries/youwol/${NAME}/${VERSION}/assets/style.css`}),
        loadWasm
    ])*/
    return loadWasm
}

export let pack = new FluxPack({
    ...AUTO_GENERATED,
    ...{
        install
    }
})

