​
    /**
     * @brief Build a BemSurface discontinuity given an array representing the
     * packed positions of the vertices and an array representing the indices of the
     * triangles.
     * @returns A BemSurface discontinuity
     */
    export type buildSurface = (position: Array<number>, index: Array<number>) => BemSurface
​
    /**
     * @brief Build a grid given an array representing the
     * packed positions.
     * @returns A Grid
     */
    export type buildGrid = (position: Array<number>)=> Grid
​
    /**
     * @brief Create a user-defined remote stress that has to be applied
     * to the model using a callback.
     * @example
     * const r1 = arch.createUserRemote( (x,y,z) => {
     *   const rho = 2200
     *   const a   = -rho*9.81*z
     *   const xx  = a * 0.1
     *   const yy  = a * 0.2
     *   const zz  = a
     *   return [xx, 0, 0, yy, 0, zz]
     * })
     * model.addRemoteStress(r1)
     */
    export type createUserRemote = (cb: Function) => UserRemote
​
    /**
     * @brief Create a user-defined TIC (Traction Inequality Constraint) by providing a callback
     * @param cb The callback which has the signature `[tx,ty,tz] cb(x, y, z, tx, ty, tz)` and which
     * is evaluated for each triangle. (x,y,z) represents the center of the triangle whereas
     * (tx,ty,tz) are the current traction vector applied at this triangle. The return value is an array of
     * size 3 representing the modified traction vector.
     * @returns The newly created inequality constraint on traction
     * @example
     * const c = arch.createUserTic( (x,y,z, tx,ty,tz) => [tx, ty, 0] )
     * surface1.addConstraint(c)
     * surface2.addConstraint(c)
     */
    export type createUserTic = (cb: Function) => Inequality
​
    /**
     * @brief Create a user-defined DIC (Displacement Inequality Constraint) by providing a callback
     * @param cb The callback which has the signature `[dx,dy,dz] cb(x, y, z, dx, dy, dz)` and which
     * is evaluated for each triangle. (x,y,z) represents the center of the triangle whereas
     * (dx,dy,dz) are the current displacement vector applied at this triangle. The return value is an
     * array of size 3 representing the modified displacement vector.
     * @returns The newly created inequality constraint on displacement
     * @example
     * // Prevent interpenetration of the triangles (x-axis in Okada convention)
     * const c = arch.createUserDic( (x,y,z, dx,dy,dz) => [dx<0 ? 0 : dx, dy, dz] )
     * surface.addConstraint(c)
     */
    export type createUserDic = (cb: Function) => Inequality
​
    /**
     * @brief Create a predefined inequality constraint to a BemSurface. Possible constraint are:
     * 1) Coulomb: friction=[0...]; cohesion=[0...]; lambda=[0..1]; stick=true
     * 2) CoulombOrtho: theta=0; frictionDip=[0...]; frictionStrike=[0...]; cohesionDip=[0...]; cohesionStrike=[0...]; lambda==[0...1]; stick=true
     * 3) MaxDisplacement: axis=int[0..2]; value=double
     * 4) MaxNormDisplacement: value=double
     * 5) MaxNormTraction: value=double
     * 6) MaxTraction: axis=int[0..2]; value=double
     * 7) MinDisplacement: axis=int[0..2]; value=double
     * 8) MinimumDTraction: axis=int[0..2]; value=double
     * @param name The name of the constraint
     * @returns The Inequality
     * @note To add a constraint to a surface discontiniuty, first create your constraint `c` 
     * (user-defined or pre-defined) and then call the method `c.addTo(surface)`.
     */
    export type createConstraint = (name: string) => Inequality
​
    // ==================================================================================================
​
    export interface Timer {
        /**
         * @brief Start the timer
         */
        start(): void
​
        /**
         * @brief Stop the timer and return the elasped time in ms from the
         * last call to start()
         */
        stop(): number
    }
​
    export interface Inequality {
        /**
         * @brief Set a parameter of a pre-defined inequality constraint
         * 
         * Examples of inequality with associated parameters
         * ```
         * 1) Coulomb: friction=[0...]; cohesion=[0...]; lambda=[0..1]; stick=true
         * 2) CoulombOrtho: theta=0; frictionDip=[0...]; frictionStrike=[0...]; cohesionDip=[0...]; cohesionStrike=[0...]; lambda==[0...1]; stick=true
         * 3) MaxDisplacement: axis=int[0..2]; value=double
         * 4) MaxNormDisplacement: value=double
         * 5) MaxNormTraction: value=double
         * 6) MaxTraction: axis=int[0..2]; value=double
         * 7) MinDisplacement: axis=int[0..2]; value=double
         * 8) MinimumDTraction: axis=int[0..2]; value=double
         * ```
         * 
         * @see function createConstraint for more info about the parameters of a
         * given constraint
         * @param name The nale of the parameter
         * @param value The valuie of the parameter
         */
        set(name: string, value: string): void
    }
​
    export interface UserRemote {
        constructor(cb: Function): void
        setFunction(cb: Function): void
    }
​
    export interface BemSurface {
        /**
         * @brief Set the boundary type and value for each axis of the triangles making
         * a surface discontinuity.
         * 
         * For instance, in Okada convention, setting, for the x-axis, the boundary condition type to
         * traction and its value > 0 is equivalent to applying a "pressure".
         * 
         * @param axis The axis index (from 0 to 2 with 0 being the z-axis, 1 the y axis and 2 the x-axis)
         * @param type The type of boundary condition for the considered axis. For traction condition,
         * value can be either "t", "0", "free", "traction", "neumann" or "unknown". All these values have the same 
         * meaning. For displacement condition, value can be either "b", "1", "displ", "displacement", "fixed",
         * "dirichlet", "locked" or "imposed". All these values have the same meaning.
         * When an axis is free, it means that the provided boundary value will a traction component (along the axis)
         * since the displacement is unknown. Similarly, when the boundary condition is "locked", the
         * provided value is an imposed displacement along the axis.
         * @param value The boundary value for the considered axis. It can be either a constant (number or string)
         * or a callback with parameter (x,y,z), the center of the considered triangle, and returning a number.
         * If the value is a callbak, then the signature is `double cb(double x, double y, double z)`.
         * @example
         * const rho = 2100
         * const g = 9.81
         * surface.setBC(0, "free"  , 0)
         * surface.setBC(1, "locked", 0)
         * surface.setBC(2, "free"  , (x,y,z) => 1e3 + rho*g*z)
         */
        setBC(axis: number, type: string, value: any): void
​
        /**
         * Set the current displacement based on attribute names for each local axis
         * @param normal Attribute name
         * @param strike Attribute name
         * @param dip Attribute name
         */
        setDispl(normal: string, strike: string, dip: string): void
​
        /**
         * @brief Get the Computed displacement on a BemSurface after solving the model.
         * Note that this attribute is provided at triangles, not at vertices.
         * @param local True if you want displacement vectors in local coordinate system (e.g., to
         * display iso-contours on the surface), false for the global coordinate system (e.g., if
         * you wan to deform the surface according to the displacement field)
         * @param atTriangles True if you want the returned displacement field to be at triangles,
         * otherwise it will be defined (interpolate) at vertices.
         * @returns An array of packed displacement vector [x,y,z...x,y,z]
         * @example
         * // Get the displacement field at nodes in global coordinate system
         * const displ = surface.getComputedDisplacement(false, false)
         * for (let i=0; i<displ.length; i+=3) { // notice the increment
         *     console.log(displ[i], displ[i+1], displ[i+2])
         * }
         */
        getComputedDisplacement(local: boolean, atTriangles: boolean): Array<number>
​
        /**
         * @brief Add a pre-defined or a user-defined inequality constraint to this surface
         * @param c The constraint
         * @see createConstraint to add to this surface
         * @see createUserDic
         * @see createUserTic
         */
        addConstraint(c: Inequality): void
    }
​
    export interface Material {
        constructor(poisson: number, young: number, density: number): void
        poisson: number
        young: number
        density: number
    }
​
    export interface Model {
        /**
         * @brief False by default
         */
        setHalfSpace(b: boolean): void
​
        setMaterial(m: Material): void
​
        addSurface(s: BemSurface): void
​
        addGrid(m: Grid): void
​
        /**
         * @brief Get the number of dof (degree of freedom) in the model
         */
        nbDof(): number
​
        /**
         * @brief Get the total number of triangles in the model
         */
        nbTriangles(): number
​
        /**
         * @brief Get the total number of points (from grids) in the model
         */
        nbPoints(): number
​
        /**
         * @brief Get the number of surface discontinuities in the model
         */
        nbSurfaces(): number
​
        /**
         * @brief Get the number of grids in the model
         */
        nbGrids(): number
​
        /**
         * @brief Set the Poly3D Convention
         * <ul>
         * <li> x is dip (pointing downward on fault plane when normal is up)
         * <li> y is strike
         * <li> z is normal
         * </ul>
         * @see setOkadaConvention
         */
        setPoly3DConvention(): void
​
        /**
         * @brief Set the Okada Convention (default).
         * <ul>
         * <li> x axis is the normal of the triangle
         * <li> y axis is along strike
         * <li> z axis is dip (pointing upward on fault plane when normal is up)
         * </ul>
         * @see setPoly3DConvention
         */
        setOkadaConvention(): void
​
        /**
         * @brief Add a remote to the model
         * @example
         * model.addRemoteStress(myRemote)
         */
        addRemoteStress(remote: UserRemote): void
​
        /**
         * @brief Post process at all observation grids (Grid) after the model is solved.
         * @param displ True if displacement has to be computed
         * @param strain True if strain has to be computed
         * @param stress True if stress has to be computed
         * @param displName The name of the Displacement attribute
         * @param strainName The name of the strain attribute
         * @param stressName The name of the stress attribute
         */
        postprocess(displ: boolean, strain: boolean, stress: boolean, displName: String, strainName: String, stressName: String): void
​
        /**
         * @brief Run a model by solving the unknown displacements on surface
         * discontinuities.
         * 
         * @param model 
         * @param tol 
         * @param maxIterations 
         */
        run(tol: number, maxIterations: number, nbCores: number): void
​
        /**
         * @brief valuate the strain tensor (symetric) at (x,y,z)
         * @param x the x coordinate
         * @param y the y coordinate
         * @param z the z coordinate
         * @returns The array [xx, xy, xz, yy, yz, zz] of the tensor components
         */
        strainAt(x: number, y: number, z: number): Array<number>
​
        /**
         * @brief valuate the stress tensor (symetric) at (x,y,z)
         * @param x the x coordinate
         * @param y the y coordinate
         * @param z the z coordinate
         * @returns The array [xx, xy, xz, yy, yz, zz] of the tensor components
         */
        stressAt(x: number, y: number, z: number): Array<number>
​
        /**
         * @brief valuate the displacement vector at (x,y,z)
         * @param x the x coordinate
         * @param y the y coordinate
         * @param z the z coordinate
         * @returns The array [x,y,z] of the displacement vector
         */
        displAt(x: number, y: number, z: number): Array<number>
    }
​
    /**
     * @brief This class is still a work in progress and does not work yet!
     * 
     * Create a special solver that can be reused any time if the
     * remote, the boundary values of the surface discontinuities, the young
     * modulus or the density are changed.
     * 
     * It avoids to build the system matrix each time the geometry and the boundary
     * conditions of the surface discontinuities as well as the young modulus and the
     * density don't change. Also, discontinuities cannot be added or removed from the
     * model, otherwise, the system have to be rebuilt (and therefore, this class is
     * useless).
     * 
     * This class is meant to be used for superposition, for example, for teaching
     * purpose, or for investgating new ideas.
     * 
     * Usage
     * @example
     * const solver = arch.ModelSolver(model, 1e-9, 200)
     * 
     * remote.setFunction( (x,y,z) => [1, 0, 0, 0, 0, 0] )
     * solver.run()
     * model.postprocess(true, false, true, "U", "E", "S")
     * const U1 = grid.getAttribute('vector3', 'U', false)
     * 
     * remote.setFunction( (x,y,z) => [0, 1, 0, 0, 0, 0] )
     * solver.run()
     * model.postprocess(true, false, true, "U", "E", "S")
     * const U2 = grid.getAttribute('vector3', 'U', false)
     * 
     * // ... etc
     */
    export interface ModelSolver {
        /**
         * @brief Construct a solver for the model which allows to call multiple time run()
         * without rebuilding the system each time if and only if:
         * - the number of triangles in the model does not change
         * - the geometry of the surfaces changed
         * - the bc type of each triangle does not change
         * - we do not change the poisson's ratio
         * 
         * On the other hand, it is possible to
         * - change the remote
         * - add new remotes
         * - add pressure in discontinuities if traction was prescribed along the normal direction
         * 
         * If a changed is detected in the model (the number of triangles changed, the bc type of at least
         * one triangle changed, the geometry of surfaces changed), then the system matrix is rebuild.
         * 
         * @param model The model
         * @param solverName The name of the solver to use for the computation
         * ('seidel', 'jacobi', 'gmres', 'cgls'). Default is 'seidel' (if solverName is unknown).
         * @param tol The tolerence of the solver (usually 1e-9)
         * @param maxIter The maximum nulber of iterations (usually 200)
         */
        constructor(model: Model, solverName: String, tol: number, maxIter: number): void
​
        /**
         * @brief Each time the remote(s), the boundary values of
         * the surface discontinuities, the young modulus or the density are changed,
         * you can call this method to recompute the solution.
         */
        run(): void
​
        /**
         * @brief Set the solver as dirty meaning that the underlaying system matrix
         * will be rebuild. This happens when, for example:
         * - the number of triangles in the model changed (automatically detected)
         * - the bc type of at least one triangle changed (automatically detected)
         * - the poisson's ratio changed                  (automatically detected)
         * - the geometry of at least one surface changed (not detected for now!!!)
         * 
         * For instance, if you change the geometry of a surface (deformation,
         * translation, scale, rotation...), then as it is not detected, you will have to
         * make sure to call setDirty().
         */
        setDirty(): void
    }
​
    export interface Grid {
        /**
         * @brief Get a computed attribute on a Grid
         * @param type The type of attribute ('scalar', 'vector3', 'matrix3')
         * @param name The name of the attribute
         * @param packed True if the returned array is packed, false otherwise
         * @returns A packed array of the attribute.
         */
        getAttribute(type: String, name: String, packed: boolean): Array<number> ;
    }