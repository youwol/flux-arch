import { fetchBundles } from "@youwol/cdn-client";
import { IEnvironment } from "@youwol/flux-core";
import { attr$, child$, childrenAppendOnly$, HTMLElement$, VirtualDOM } from "@youwol/flux-view";
import { Observable, ReplaySubject, Subscription } from "rxjs";
import { map, mergeMap, scan, take } from "rxjs/operators";

export class ProgressViewData{

    progressData$ = new ReplaySubject<number>(1)
    subscription: Subscription

    constructor(
        progress$: Observable<number>
        ){
            this.subscription = progress$.subscribe( d => this.progressData$.next(d))
        }
}

export function  progressView(data: ProgressViewData): VirtualDOM{

    return {
        class:'w-100 fv-bg-background-alt',
        style:{"height":"5px"},
        children:[
            child$(
                data.progressData$,
                (progress) => {
                    return {
                        class: 'h-100 fv-bg-focus',
                        style:{width:`${progress}%`}
                    }
                }
            )
        ]
    }
}


export class ConvergencePlotData {

    progressData$ = new ReplaySubject<{iteration:number, residue: number}>()
    subscription: Subscription

    constructor(
        progress$: Observable<{iteration:number, residue: number}>,
        public readonly tolerance: number,
        public readonly maxIteration: number,
        public readonly environment: IEnvironment){

            this.subscription = progress$.subscribe( d => this.progressData$.next(d))
        }
}

export function convergencePlotViewD3(data: ConvergencePlotData): VirtualDOM{

    let fullWidth = 460
    let fullHeight = 400
    let margin = {top: 10, right: 30, bottom: 40, left: 60}
    let width = fullHeight - margin.left - margin.right
    let height = fullHeight - margin.top - margin.bottom

    return {
        style:{
            width:`${fullWidth}px`, 
            height:`${fullHeight}px`, 
            backgroundColor: 'white', 
            position:'relative'
        },
        children: [
            child$( 
                data.environment.fetchJavascriptAddOn("d3#5.15.0~d3.min.js"),
                () => {
                    return {
                        connectedCallback: (elem: HTMLElement$) => {
                            let d3 = window['d3']
                            
                            let svg = createSvg({
                                d3,
                                elem, 
                                width, 
                                height, 
                                margin
                            })
                            let {x,y} = createAxis({
                                svg,
                                d3,
                                width,
                                height,
                                margin,
                                maxIteration:data.maxIteration, 
                                tolerance:data.tolerance
                            })
                            
                            let sub = data.progressData$.pipe(
                                scan( (acc,e) => acc.concat(e), [])
                            ).subscribe( (d) => {
                                svg
                                .selectAll("circle")
                                .data(d)
                                .enter()
                                .append("circle")
                                .attr("cx", (d) => x(d.iteration)  )
                                .attr("cy", (d) => y(d.residue) )
                                .attr("r", 5)
                                .attr("fill", "#69b3a2")
                            })
                            elem.ownSubscriptions(sub)
                        }
                    }
                }) 
        ],
        connectedCallback: (elem: HTMLElement$) => {
            elem.ownSubscriptions(data.subscription)
        }
    }
}

function createSvg({d3, elem, width, height, margin}) {

    return d3.select(elem)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function createAxis({svg, d3, maxIteration, width, height, tolerance, margin} ){

    var x = d3.scaleLinear()
    .domain( [0, maxIteration])
    .range([ 0, width ]);

    var y = d3.scaleLog()
    .domain([tolerance, 1])
    .range([height, 0]);
    
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("color", "black")
    .call(d3.axisBottom(x));

    svg.append("g")
    .attr("color", "black")
    .call(d3.axisLeft(y));
    
    svg.append("text")             
    .attr("transform",`translate(${width/2},${height + margin.top + 20})`)
    .style("text-anchor", "middle")
    .text("Iteration");

    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Residual");
    return {x,y}
}