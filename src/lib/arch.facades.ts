/*
Those datastructure are meant to be send to web workers => they are data-only
*/
export namespace ArchFacade {

    export class ArchModelComponent{

    }

    export class Constraint {
        constructor(public readonly type: string, public readonly parameters) { }
    }

    export class CoulombConstraint extends Constraint {

        constructor({ friction, cohesion }: { friction: number, cohesion: number }) {
            super("ArchCoulombConstraintNode", { friction, cohesion })
        }
    }

    export class CoulombOrthoConstraint extends Constraint {

        constructor({ theta, frictionDip, frictionStrike }:
            { theta: number, frictionDip: number, frictionStrike: number }) {
            super("ArchCoulombOrthoConstraintNode", { theta, frictionDip, frictionStrike })
        }
    }
    /*
    export class DisplacementConstraint extends Constraint {

        constructor({ axis, value, direction, type }:
            { axis: string, value: number, direction: string, type: string }) {
            super("ArchDisplacementConstraintNode", { axis, value, direction, type })
        }
    }

    export class DisplacementNormConstraint extends Constraint {

        constructor({ value, direction, type }:
            { value: number, direction: string, type: string }) {
            super("ArchDisplacementNormConstraintNode", { value, direction, type })
        }
    }*/

    export class Remote extends ArchModelComponent {

        constructor(public readonly type: string, public readonly parameters) {
            super()
         }
    }

    export class AndersonianRemote extends Remote {

        constructor({ HSigma, hSigma, vSigma, theta }:
            { HSigma: number, hSigma: number, vSigma: number, theta: number }) {
            super("ArchAndersonianRemoteNode", { HSigma, hSigma, vSigma, theta })
        }
    }

    type Field = string | ((x,y,z)=>number)
    export class BoundaryCondition {

        readonly parameters: {
            dipAxis: { type: string, field: string },
            strikeAxis: { type: string, field: string },
            normalAxis: { type: string, field: string }
        }
        public readonly type = "ArchBoundaryConditionNode"

        constructor({ dipAxis, strikeAxis, normalAxis }:
            {
                dipAxis: { type: string, field: Field },
                strikeAxis: { type: string, field: Field },
                normalAxis: { type: string, field: Field }
            }) {

            let ensureString = (axis) => ({
                type: axis.type, 
                field: typeof(axis.field) == 'string' ? axis.field : `return ${String(axis.field)}`
            })
            this.parameters = { 
                dipAxis: ensureString(dipAxis),
                strikeAxis:ensureString(strikeAxis),
                normalAxis:ensureString(normalAxis)
            }
        }
    }

    export class Material extends ArchModelComponent {

        readonly parameters: { poisson: number, young: number, density: number }

        constructor({ poisson, young, density }:
            { poisson: number, young: number, density: number }) {
            super()
            this.parameters = { poisson, young, density }
        }
    }

    export class Surface extends ArchModelComponent {

        public readonly positions: Float32Array // shared array buffer

        public readonly indexes: Uint16Array // shared array buffer

        public readonly boundaryCondition: BoundaryCondition

        public readonly constraints: Array<Constraint>

        constructor({ positions, indexes, boundaryCondition, constraints } :
            {   positions: Float32Array, 
                indexes: Uint16Array,
                boundaryCondition:BoundaryCondition, 
                constraints:  Array<Constraint>
            }) {

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

        constructor({ surfaces, material, remotes, solver } : 
            {   surfaces: Array<Surface>, 
                material: Material, 
                remotes: Array<Remote>,
                solver: Solver
            }) {
            this.surfaces = surfaces
            this.material = material
            this.remotes = remotes
            this.solver = solver
        }
    }

    export class Solution{
        constructor(
            public readonly model: Model,
            public readonly burgers: Array<SharedArrayBuffer>
            ){}
    }


    export function factory(type, parameters, arch, factoryFct = undefined) {
        
        factoryFct = factoryFct || factory
        
        if( type == "ArchMaterialNode") 
            return new arch.Material(parameters.poisson, parameters.young, parameters.density)

        if (type == 'ArchCoulombConstraintNode')
            return new arch.Coulomb(parameters.friction, parameters.cohesion)

        if (type == 'ArchCoulombOrthoConstraintNode') {

            let c = new arch.CoulombOrtho()
            c.theta = parameters.theta
            c.frictionDip = parameters.frictionDip
            c.frictionStrike = parameters.frictionStrike
            return c
        }
        
        if (type == 'ArchDisplacementConstraintNode') {

            if (parameters.direction == 'compression' && parameters.type == 'max')
                return arch.MaxDispl(parameters.axis, parameters.value)
            if (parameters.direction == 'compression' && parameters.type == 'min')
                return arch.MinDispl(parameters.axis, parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'max')
                return arch.MaxTraction(parameters.axis, parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'min')
                return arch.MinTraction(parameters.axis, parameters.value)
        }

        if (type == 'ArchDisplacementNormConstraintNode') {

            if (parameters.direction == 'compression' && parameters.type == 'max')
                return arch.MaxNormDispl(parameters.value)
            if (parameters.direction == 'traction' && parameters.type == 'max')
                return arch.MaxNormTraction(parameters.value)
        }
        
        if (type == "ArchAndersonianRemoteNode") {

            let r = new arch.AndersonianRemote()
            r.stress = true
            r.h = parameters.hSigma
            r.H = parameters.HSigma
            r.v = parameters.vSigma
            r.theta = parameters.theta
            return r
        }
        if (type == "ArchSolverNode"){
            return new Solver(parameters.type, parameters)
        }
        if (type == "ArchSurfaceNode"){

            let surfaceData: Surface = parameters
            let positions = Array.from(new Float32Array(surfaceData.positions))
            let indexes =Array.from(new Uint16Array(surfaceData.indexes))
            let surface = new arch.Surface( positions,  indexes )
            surfaceData.constraints.forEach( constraint => {
                surface.addConstraint( factoryFct(constraint.type, constraint.parameters, arch, factoryFct))
            })
            
            let bcData = surfaceData.boundaryCondition.parameters
            surface.setBC( 
                'dip', 
                bcData.dipAxis.type,  
                typeof(bcData.dipAxis.field)=="string" ?  new Function(bcData.dipAxis.field)() : bcData.dipAxis.field
                )
            surface.setBC( 
                'strike', 
                bcData.strikeAxis.type,  
                typeof(bcData.strikeAxis.field)=="string" ? new Function(bcData.strikeAxis.field)() : bcData.strikeAxis.field
                )
            surface.setBC( 
                'normal', 
                bcData.normalAxis.type, 
                typeof(bcData.normalAxis.field)=="string" ? new Function(bcData.normalAxis.field)() : bcData.normalAxis.field
                )
                
            return surface
        }

        if (type == "ArchModelNode") {
        
            let model = new arch.Model()
            model.setHalfSpace(false)
            let material = factoryFct("ArchMaterialNode", parameters.material.parameters, arch, factoryFct)
            model.setMaterial(material)

            let surfaces = parameters.surfaces.map( s => factoryFct("ArchSurfaceNode", s, arch, factoryFct))
            surfaces.forEach( s => model.addSurface(s))

            let remotes = parameters.remotes.map( r => factoryFct(r.type, r.parameters, arch, factoryFct))
            remotes.forEach( r => model.addRemote(r)) 

            return model
        }
    }

}