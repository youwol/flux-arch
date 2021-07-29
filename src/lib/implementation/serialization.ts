/*

export function createNewProject(folder: FileSystem.Folder) {

    let drive = folder.drive
    return forkJoin([
        drive.createFolder(folder.id, "discontinuities"),
        drive.createFolder(folder.id, "observation-spaces"),
        drive.createFolder(folder.id, "remote-stress-fields")
    ]).pipe(
        map(([f0, f1, f2]) => `
        return {
            name: 'arch', type: ['project'], nodeType:'RootArchNode',
            folders: {
                discontinuities: '${f0.id}',
                observationSpaces: '${f1.id}',
                remotesStressFields: '${f2.id}'                
            },
            children: [ 
                { name: 'discontinuities', type: ['folder', 'discontinuities'], children: [], nodeType:'ArchFolderDiscontinuityNode'},
                { name: 'observation grids', type: ['observation', 'folder'], children: [], nodeType:'ArchFolderObservationNode' },
                { name: 'remotes stress', type: ['remotes','folder'], children: [], nodeType:'ArchFolderRemoteNode' },
                { name: 'scripts', type: ['scripts','folder'], children: [], nodeType:'ArchFolderScriptNode' }
            ]
        }`),
        mergeMap((content) =>
            drive
                .createFile(folder.id, 'config.js', new Blob([content], { type: 'application/javascript' }))
                .pipe(map((f) => {
                  return  {file:f,folder,content}
                }))
        )
    )
}

  this.root$.pipe(
                tap( state => this.state = state as RootArchNode),
                map( state => JSON.stringify(state.data(), null,'\t')),
                mergeMap( (content) => 
                    AssetsFilesystem.Backend.updateFile(file.drive.id,file.id,new Blob(["return "+content], { type: 'application/javascript' }),this.drive.events$) 
                )
            ).subscribe( (d) => console.log('project updated!', d))
            
            AssetsFilesystem
                .getFolderOrCreate(`${config.usersGroup}/arch/${config.projectName}`,false).pipe(
                    mergeMap(({ created, folder }) => created
                        ? createNewProject(folder)
                        : folder.listItems().pipe(
                            map(({ files }) => files.find(file => file.name == 'config.js')),
                            mergeMap(file => file.readAsText(undefined).pipe(map(content => ({ file, folder, content }))))
                        )
                    )).subscribe(({ file, folder, content }) => {
                        let data = new Function(content)()
                        let rootNode = parseProject(data) as RootArchNode
                        this.stateMgr = new StateMgr(rootNode, folder, file, {selection$:this.selection$})
                        this.stateMgr.root$.pipe(
                            mergeMap( (root: RootArchNode) => 
                                buildModel(root, this.stateMgr.drive).pipe(map(model=>[root,model])) 
                            ),
                        ).subscribe( ([root, model]) => this.project$.next({ data: { 
                                state: root as ArchNode, 
                                manager: this.stateMgr,
                                model: model as any }, context: {} }))
                        
                        this.state$.next(this.stateMgr) // signal for View 
                    })
            
    */