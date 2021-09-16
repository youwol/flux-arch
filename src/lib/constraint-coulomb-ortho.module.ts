
import { pack } from './main';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-core'
import { ConstraintBase } from './constraint-base.module'
import { ArchFacade } from './arch.facades';

export namespace ModuleConstraintCoulombOrtho {
    
    @Schema({
        pack: pack
    })
    export class PersistentData {

        @Property({
            description:"The rotation angle (in degrees) of the orthotropy",
            min: 0,
            max: 180
        })
        theta: number = 0

        @Property({
            description:"The static sliding friction coefficient along the dip axis",
            min: 0,
            max: 1
        })
        frictionDip: number = 0

        @Property({
            description:"The static sliding friction coefficient along the strike axis",
            min: 0,
            max: 1
        })
        frictionStrike: number = 0
        
        @Property({description:"Whether or not the module emit the saved configuration when the module is loaded."})
        emitInitialValue: boolean = true

        constructor( params: 
                    {theta?: number, frictionDip?:number,  frictionStrike?:number, emitInitialValue?:boolean } = {}) {

            Object.assign(this, params)     
        }
    }

    @Flux({
        pack: pack,
        namespace: ModuleConstraintCoulombOrtho,
        id: "ModuleConstraintCoulombOrtho",
        displayName: "Coulomb Ortho",
        description: "Coulomb type of surface's constraint"
    })
    @BuilderView({
        namespace: ModuleConstraintCoulombOrtho,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArchFacade.CoulombOrthoConstraint {
            return new ArchFacade.CoulombOrthoConstraint(config)
        }
    }
}
