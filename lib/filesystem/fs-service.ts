const CONFIG_PATH = ".localgoo/config.json"

export class FileSystemService {
  private rootHandle: FileSystemDirectoryHandle | null = null

  async selectWorkspace(): Promise<FileSystemDirectoryHandle> {
    const handle = await window.showDirectoryPicker({mode: "readwrite"})
    this.rootHandle = handle   
    return handle;
}


  async restoreWorkspace(): Promise<FileSystemDirectoryHandle>{ 

  }

}


const IDB_NAME = "localgoo";
const IDB_STORE = "handles"

function idb():Promise<IDBDatabase> { 
return new Promise((res , rej) => { 
    const req = indexedDB.open(IDB_NAME , 1);   
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result)  
    req.onerror = () => rej(req.error) 
})
}

async function saveHandlerToId(key: string , handle: FileSystemHandle): Promise<void> {
    const db = await idb();
    return new Promise((res , rej) => { 
       const tx = db.transaction(IDB_STORE, "readwrite");
       tx.objectStore(IDB_STORE).put(handle, key) 
       tx.oncomplete = () => res();
       tx.onerror = () => rej(tx.error)
    })
}

async function getHandleFromId(key: string): Promise<FileSystemHandle | null> { 
    const db = await idb();
    return new Promise((res , rej) => { 
       const tx = db.transaction(IDB_STORE , "readonly")
       const req = tx.objectStore(IDB_STORE).get(key)
       req.onsuccess = () => res(req.result as FileSystemHandle | null) 
       req.onerror = () => rej(req.error)
    })
}


