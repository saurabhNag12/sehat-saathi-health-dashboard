const DB_NAME = 'sehat-saathi-offline';
const DB_VERSION = 2;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('patients')) db.createObjectStore('patients', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'operationId' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'queueId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local database.'));
  });
}

async function transaction(storeName, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try { result = action(store); } catch (error) { db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(result?.result); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Local database operation failed.')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Local database operation was cancelled.')); };
  });
}

export async function getPatients() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patients', 'readonly');
    const request = tx.objectStore('patients').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function savePatients(patients) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patients', 'readwrite');
    const store = tx.objectStore('patients');
    store.clear();
    patients.forEach(patient => store.put(patient));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not save local records.')); };
  });
}

export async function addOperation(type, recordId, details = {}) {
  const operation = {
    operationId: crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    recordId: String(recordId),
    status: 'pending',
    createdAt: new Date().toISOString(),
    details
  };
  await transaction('operations', 'readwrite', store => store.put(operation));
  return operation;
}

export async function getOperations() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('operations', 'readonly');
    const request = tx.objectStore('operations').getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function updateOperation(operation) {
  await transaction('operations', 'readwrite', store => store.put(operation));
}

export async function getQueue() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const request = tx.objectStore('queue').getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveQueue(queue) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    store.clear();
    queue.forEach(item => store.put(item));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not save local OPD queue.')); };
  });
}

export async function clearDemoData(starterPatients) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['patients', 'operations', 'queue'], 'readwrite');
    const patients = tx.objectStore('patients');
    patients.clear();
    starterPatients.forEach(patient => patients.put(patient));
    tx.objectStore('operations').clear();
    tx.objectStore('queue').clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Could not reset demo data.')); };
  });
}
