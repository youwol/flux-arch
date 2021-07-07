/*
Those datastructure are meant to be send to web workers => they are data-only
*/
export namespace ArcheFacade {

    export class ArcheModelComponent{

    }

    export class Constraint {
        constructor(public readonly type: string, public readonly parameters) { }
    }

    export class CoulombConstraint extends Constraint {

        constructor({ friction, cohesion }: { friction: number, cohesion: number }) {
            super("ArcheCoulombConstraintNode", { friction, cohesion })
        }
    }

    export class CoulombOrthoConstraint extends Constraint {

        constructor({ theta, frictionDip, frictionStrike }:
            { theta: number, frictionDip: number, frictionStrike: number }) {
            super("ArcheCoulombOrthoConstraintNode", { theta, frictionDip, frictionStrike })
        }
    }
    /*
    export class DisplacementConstraint extends Constraint {

        constructor({ axis, value, direction, type }:
            { axis: string, value: number, direction: string, type: string }) {
            super("ArcheDisplacementConstraintNode", { axis, value, direction, type })
        }
    }

    export class DisplacementNormConstraint extends Constraint {

        constructor({ value, direction, type }:
            { value: number, direction: string, type: string }) {
            super("ArcheDisplacementNormConstraintNode", { value, direction, type })
        }
    }*/

    export class Remote extends ArcheModelComponent {

        constructor(public readonly type: string, public readonly parameters) {
            super()
         }
    }

    export class AndersonianRemote extends Remote {

        constructor({ HSigma, hSigma, vSigma, theta }:
            { HSigma: number, hSigma: number, vSigma: number, theta: number }) {
            super("ArcheAndersonianRemoteNode", { HSigma, hSigma, vSigma, theta })
        }
    }

    export class BoundaryCondition {

        readonly parameters: {
            dipAxis: { type: string, value: number },
            strikeAxis: { type: string, value: number },
            normalAxis: { type: string, value: number }
        }
        public readonly type = "ArcheBoundaryConditionNode"

        constructor({ dipAxis, strikeAxis, normalAxis }:
            {
                dipAxis: { type: string, value: number },
                strikeAxis: { type: string, value: number },
                normalAxis: { type: string, value: number }
            }) {

            this.parameters = { dipAxis, strikeAxis, normalAxis }
        }
    }

    export class Material extends ArcheModelComponent {

        readonly parameters: { poisson: number, young: number, density: number }

        constructor({ poisson, young, density }:
            { poisson: number, young: number, density: number }) {
            super()
            this.parameters = { poisson, young, density }
        }
    }

    export class Surface extends ArcheModelComponent {

        public readonly positions: Float32Array // shared array buffer

        public readonly indexes: Uint16Array // shared array buffer

        public readonly boundaryCondition: BoundaryCondition

        public readonly constraints: Array<Constraint>

        constructor({ positions, indexes, boundaryCondition, constraints } :
            { positions: Float32Array, indexes: Uint16Array,
              boundaryCondition:BoundaryCondition, constraints:  Array<Constraint> }) {

            super()
            this.positions = positions
            this.indexes = indexes
            this.boundaryCondition = boundaryCondition
            this.constraints = constraints
        }

    }
    export class Solver {

        constructor(public readonly type: string, public readonly parameters) { }
    }

    export class Scene{

        public readonly surfaces: Array<Surface>

        public readonly material: Material

        public readonly remotes: Array<Remote>

        constructor({ surfaces, material, remotes } : 
            {   surfaces: Array<Surface>, 
                material: Material, 
                remotes: Array<Remote>}) {
            this.surfaces = surfaces
            this.material = material
            this.remotes = remotes
        }
    }

    export class Model {

        public readonly surfaces: Array<Surface>

        public readonly material: Material

        public readonly remotes: Array<Remote>

        public readonly solver: Solver

        constructor({ surfaces, material, remotes } : 
            {   surfaces: Array<Surface>, 
                material: Material, 
                remotes: Array<Remote>}) {
            this.surfaces = surfaces
            this.material = material
            this.remotes = remotes
        }
    }

    export class Solution{
        constructor(public readonly solutionId: string, public readonly worker: Worker){}
    }
    export class SolutionLocal{
        constructor(public readonly model){}

        stressAt(x:number, y: number, z: number) {
            return this.model.stressAt(x,y,z)
        }
    }

    export function factory(type, parameters, arche, factoryFct = undefined) {
        console.log("factory", type, parameters)
        factoryFct = factoryFct || factory
        
        if( type == "ArcheMaterialNode") 
            return new arche.Material(parameters.poisson, parameters.young, parameters.density)

        if (type == 'ArcheCoulombConstraintNode')
            return new arche.Coulomb(parameters.friction, parameters.cohesion)

        if (type == 'ArcheCoulombOrthoConstraintNode') {

            let c = new arche.CoulombOrtho()
            c.theta = parameters.theta
            c.frictionDip = parameters.frictionDip
            c.frictionStrike = parameters.frictionStrike
            return c
        }
        
        if (type == 'ArcheDisplacementConstraintNode') {

            if (parameters.direction == 'compression' && parameters.type == 'max')
                return arche.MaxDispl(parameters.axis, parameters.value)
            if (parameters.direction == 'compression' && parameters.type == 'min')
                return arche.MinDispl(parameters.axis, parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'max')
                return arche.MaxTraction(parameters.axis, parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'min')
                return arche.MinTraction(parameters.axis, parameters.value)
        }

        if (type == 'ArcheDisplacementNormConstraintNode') {

            if (parameters.direction == 'compression' && parameters.type == 'max')
                return arche.MaxNormDispl(parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'max')
                return arche.MaxNormTraction(parameters.value)
        }
        
        if (type == "ArcheAndersonianRemoteNode") {

            let r = new arche.AndersonianRemote()
            r.stress = true
            r.h = parameters.hSigma
            r.H = parameters.HSigma
            r.v = parameters.vSigma
            r.theta = parameters.theta
            return r
        }
        if (type == "ArcheSolverNode"){
            return new Solver(parameters.type, parameters)
        }
        if (type == "ArcheSurfaceNode"){

            let surfaceData: Surface = parameters
            let positions = Array.from(new Float32Array(surfaceData.positions))
            let indexes =Array.from(new Uint16Array(surfaceData.indexes))
            let surface = new arche.Surface( positions,  indexes )
            /*surfaceData.constraints.forEach( constraint => {
                surface.addConstraint( factoryFct(constraint.type, constraint.parameters, arche, factoryFct))
            })
            
            let bcData = surfaceData.boundaryCondition.parameters
            surface.setBC( 'dip', bcData.dipAxis.type,  bcData.dipAxis.value)
            surface.setBC( 'strike', bcData.strikeAxis.type,  bcData.strikeAxis.value)
            surface.setBC( 'normal', bcData.normalAxis.type,  bcData.normalAxis.value)*/
            surface.setBC( 'dip', 'free', 0)
            surface.setBC( 'strike', 'free',  0)
            surface.setBC( 'normal', 'free',  (x,y,z) => -2000*9.81*z)
            return surface
        }

        if (type == "ArcheModelNode") {
        
            let model = new arche.Model()
            model.setHalfSpace(false)
            let material = factoryFct("ArcheMaterialNode", parameters.material.parameters, arche, factoryFct)
            model.setMaterial(material)

            let surfaces = parameters.surfaces.map( s => factoryFct("ArcheSurfaceNode", s, arche, factoryFct))
            surfaces.forEach( s => model.addSurface(s))

            let remotes = parameters.remotes.map( r => factoryFct(r.type, r.parameters, arche, factoryFct))
            remotes.forEach( r => model.addRemote(r)) 

            return model
        }
    }

}