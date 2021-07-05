
import { pack } from './main';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-core'
import { ConstraintBase } from './constraint-base.module'
import { ArcheFacade } from './arche.facades';

export namespace ModuleConstraintCoulombOrtho {
    
    @Schema({
        pack: pack
    })
    export class PersistentData {

        @Property({description:""})
        theta: number = 0

        @Property({description:""})
        frictionDip: number = 0

        @Property({description:""})
        frictionStrike: number = 0
        
        @Property({description:""})
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

        createConstraint(config: PersistentData): ArcheFacade.CoulombOrthoConstraint {
            return new ArcheFacade.CoulombOrthoConstraint(config)
        }
    }
}
