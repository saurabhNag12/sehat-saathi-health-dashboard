import { useEffect, useMemo, useState } from 'react';
import { starterPatients, getRisk } from './data';
import { addOperation, clearDemoData, getOperations, getPatients, getQueue, savePatients, saveQueue, updateOperation } from './offlineStore';

const blankForm = {
  name: '', age: '', gender: 'Female', heartRate: '', bloodPressure: '',
  bloodSugar: '', oxygen: '', sleep: '', lastVisit: new Date().toISOString().slice(0, 10),
  notes: '', status: 'Active'
};

function App() {
  const [patients, setPatients] = useState(starterPatients);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState('Overview');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [notice, setNotice] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [operations, setOperations] = useState([]);
  const [opdQueue, setOpdQueue] = useState([]);
  const [storeError, setStoreError] = useState('');
  const [lastDemoSync, setLastDemoSync] = useState('');

  async function refreshOperations() {
    try { setOperations(await getOperations()); }
    catch (error) { setStoreError(error.message || 'Could not read local operation queue.'); }
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const saved = await getPatients();
        const savedQueue = await getQueue();
        if (!alive) return;
        setOpdQueue(savedQueue);
        if (saved.length) setPatients(saved);
        else {
          // One-time migration from the earlier student demo's localStorage.
          let legacy = [];
          try { legacy = JSON.parse(localStorage.getItem('sehat-saathi-patients') || '[]'); } catch { legacy = []; }
          const initial = legacy.length ? legacy : starterPatients;
          await savePatients(initial);
          if (!alive) return;
          setPatients(initial);
        }
        setReady(true);
        await refreshOperations();
      } catch (error) {
        if (alive) { setStoreError(error.message || 'Local storage is unavailable.'); setReady(true); }
      }
    }
    load();
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { alive = false; window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    if (ready) savePatients(patients).catch(error => setStoreError(error.message || 'Could not save records locally.'));
  }, [patients, ready]);

  useEffect(() => {
    if (ready) saveQueue(opdQueue).catch(error => setStoreError(error.message || 'Could not save the OPD queue locally.'));
  }, [opdQueue, ready]);

  const enriched = useMemo(() => patients.map(p => ({ ...p, risk: getRisk(p) })), [patients]);
  const filtered = useMemo(() => enriched.filter(p => {
    const matchesText = `${p.name} ${p.gender} ${p.notes}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (filter === 'All' || p.risk === filter);
  }), [enriched, query, filter]);
  const stats = {
    total: patients.length,
    routine: enriched.filter(p => p.risk === 'Routine').length,
    monitor: enriched.filter(p => p.risk === 'Monitor').length,
    review: enriched.filter(p => p.risk === 'Review').length
  };
  const pendingCount = operations.filter(op => op.status === 'pending').length;
  const conflictCount = operations.filter(op => op.status === 'conflict').length;
  const waitingCount = opdQueue.filter(item => item.status === 'Waiting').length;
  const consultingCount = opdQueue.filter(item => item.status === 'Consulting').length;

  function flash(message) { setNotice(message); window.setTimeout(() => setNotice(''), 3000); }
  async function queueOperation(type, id, details) {
    try { await addOperation(type, id, details); await refreshOperations(); }
    catch (error) { setStoreError(error.message || 'Could not queue this change.'); }
  }
  async function addToQueue(patient) {
    const existing = opdQueue.find(item => item.patientId === patient.id && item.status !== 'Completed');
    if (existing) { flash(`${patient.name} is already in today's active queue.`); return; }
    const queueId = crypto.randomUUID ? crypto.randomUUID() : `queue-${Date.now()}`;
    const entry = { queueId, patientId: patient.id, patientName: patient.name, status: 'Waiting', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setOpdQueue(current => [...current, entry]);
    await queueOperation('queue-add', queueId, { label: `Add to OPD queue: ${patient.name}` });
    flash('Added to this device’s local OPD queue.');
  }
  async function advanceQueue(item) {
    const nextStatus = item.status === 'Waiting' ? 'Consulting' : item.status === 'Consulting' ? 'Completed' : 'Completed';
    const updated = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    setOpdQueue(current => current.map(entry => entry.queueId === item.queueId ? updated : entry));
    await queueOperation('queue-status', item.queueId, { label: `OPD status for ${item.patientName}: ${nextStatus}` });
    flash(`Queue status changed to ${nextStatus}. Saved locally only.`);
  }
  function openNew() { setEditingId(null); setForm(blankForm); setShowForm(true); }
  function openEdit(patient) {
    setEditingId(patient.id);
    setForm({ name: patient.name, age: patient.age, gender: patient.gender, heartRate: patient.heartRate,
      bloodPressure: patient.bloodPressure, bloodSugar: patient.bloodSugar, oxygen: patient.oxygen,
      sleep: patient.sleep, lastVisit: patient.lastVisit, notes: patient.notes || '', status: patient.status || 'Active' });
    setShowForm(true);
  }
  async function savePatient(event) {
    event.preventDefault();
    const id = editingId ?? (crypto.randomUUID ? crypto.randomUUID() : Date.now());
    const record = { ...form, age: Number(form.age), heartRate: Number(form.heartRate), bloodSugar: Number(form.bloodSugar), oxygen: Number(form.oxygen), sleep: Number(form.sleep), id };
    const type = editingId !== null ? 'update' : 'create';
    setPatients(current => editingId !== null ? current.map(p => p.id === editingId ? record : p) : [record, ...current]);
    await queueOperation(type, id, { label: `${type === 'create' ? 'New visit record' : 'Record update'}: ${record.name}` });
    setShowForm(false);
    flash(isOnline ? 'Saved on this device. Waiting for a real server connection.' : 'Saved on this device while offline.');
  }
  async function deletePatient(id) {
    const patient = patients.find(p => p.id === id);
    if (window.confirm('Delete this fictional demonstration record?')) {
      setPatients(current => current.filter(p => p.id !== id));
      await queueOperation('delete', id, { label: `Delete record: ${patient?.name || id}` });
      flash('Deletion saved locally and queued.');
    }
  }
  function exportCsv() {
    const headers = ['Name', 'Age', 'Gender', 'Heart rate', 'Blood pressure', 'Blood sugar', 'Oxygen', 'Sleep hours', 'Last visit', 'Status', 'Review category'];
    const rows = enriched.map(p => [p.name, p.age, p.gender, p.heartRate, p.bloodPressure, p.bloodSugar, p.oxygen, p.sleep, p.lastVisit, p.status, p.risk]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sehat-saathi-demo-records.csv'; link.click(); URL.revokeObjectURL(url);
  }
  async function resetDemo() {
    if (window.confirm('Restore fictional sample records and clear the local demo queue?')) {
      try { await clearDemoData(starterPatients); setPatients(starterPatients); setOpdQueue([]); await refreshOperations(); setQuery(''); setFilter('All'); flash('Fictional sample records restored.'); }
      catch (error) { setStoreError(error.message || 'Could not reset demo data.'); }
    }
  }
  async function simulateAcknowledgement() {
    if (!isOnline) { flash('You are offline. Reconnect before running the sync demonstration.'); return; }
    const pending = operations.filter(op => op.status === 'pending');
    if (!pending.length) { flash('No pending demo operations.'); return; }
    // This deliberately simulates a server acknowledgement for coursework. It does not contact a server.
    for (const op of pending) await updateOperation({ ...op, status: 'demo-acknowledged', acknowledgedAt: new Date().toISOString() });
    setLastDemoSync(new Date().toISOString());
    await refreshOperations();
    flash(`${pending.length} operation(s) marked as demo-acknowledged. No server was contacted.`);
  }
  async function createConflictExample() {
    await addOperation('update', 'fictional-conflict-example', { label: 'Demo conflict: two versions of a fictional note', localVersion: 'Follow-up requested', remoteVersion: 'Follow-up completed' }).then(async op => {
      await updateOperation({ ...op, status: 'conflict' });
      await refreshOperations();
      flash('Added a fictional conflict example for demonstration.');
    }).catch(error => setStoreError(error.message || 'Could not create conflict example.'));
  }
  async function resolveDemoConflict(op) {
    await updateOperation({ ...op, status: 'demo-reviewed', reviewedAt: new Date().toISOString() });
    await refreshOperations();
    flash('Demo conflict marked as reviewed. No clinical record was changed.');
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => setPage('Overview')}><span className="brand-mark">S</span><span><strong>Sehat Saathi</strong><small>Offline clinic workflow</small></span></a>
      <p className="nav-caption">WORKSPACE</p>
      {['Overview', 'Patient records', 'OPD queue', 'Health review', 'Offline & sync', 'Project notes'].map((item, i) => <button key={item} className={`nav-link ${page === item ? 'selected' : ''}`} onClick={() => setPage(item)}><span className="nav-icon">{['▦', '♙', '☷', '♡', '↻', '☰'][i]}</span>{item}{item === 'Offline & sync' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}{item === 'OPD queue' && waitingCount > 0 && <span className="nav-count">{waitingCount}</span>}</button>)}
      <div className="sidebar-bottom"><div className="demo-tag"><span className="dot" /> Offline demo</div><p>Fictional data only. Not approved for clinical use.</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> {page}</div><div className="top-actions"><span className={`connection-label ${isOnline ? 'connected' : 'disconnected'}`}><span className="dot" />{isOnline ? 'Browser online' : 'Offline mode'}</span><button className="button button-light" onClick={exportCsv}>Export CSV ↗</button></div></header>
      <section className="page-content">
        {storeError && <div className="storage-warning" role="alert"><strong>Local storage warning:</strong> {storeError}</div>}
        {page === 'Project notes' ? <section className="intro-card notes-page"><p className="eyebrow">ABOUT THIS PROJECT</p><h1>Care continues. Sync stays visible.</h1><p>Sehat Saathi Offline is a student demonstration of offline-first workflows. It stores fictional patient records and a pending-operation queue in IndexedDB, detects browser connectivity changes, and demonstrates explicit sync statuses without calling an external AI service.</p><div className="note-grid"><article><h3>What works</h3><p>Local records, a device-local OPD queue, add/edit/delete, search, filters, CSV export, offline status, persistent pending operations, and a clearly labelled acknowledgement simulator.</p></article><article><h3>Where data lives</h3><p>Fictional records, OPD queue entries and operations are stored in this browser's IndexedDB. They do not sync between devices or to a server.</p></article><article><h3>What is not implemented</h3><p>No authentication, shared database, secure sync API, encryption-at-rest strategy, or production access controls. Do not enter real patient information.</p></article></div></section>
        : page === 'Offline & sync' ? <>
          <div className="page-heading"><div><p className="eyebrow">OFFLINE WORKSPACE</p><h1>Offline & sync</h1><p className="subheading">See local changes, pending operations and the conflict-handling demonstration.</p></div><button className="button button-primary" onClick={simulateAcknowledgement}>Run sync demo</button></div>
          <div className="sync-warning"><strong>Demo mode — no server is connected.</strong><p>The “Run sync demo” button only changes local demonstration statuses. It does not upload records or synchronize with another device.</p></div>
          <div className="stat-grid sync-stats"><StatCard label="Connection" value={isOnline ? 'Online' : 'Offline'} detail="Browser connectivity signal" symbol={isOnline ? '↗' : '×'} tone={isOnline ? 'green' : 'amber'} /><StatCard label="Pending operations" value={pendingCount} detail="Stored on this device" symbol="◷" tone="amber"/><StatCard label="Conflicts" value={conflictCount} detail="Require a review in this demo" symbol="!" tone="rose"/><StatCard label="Local records" value={patients.length} detail="Fictional records only" symbol="▤" tone="sage"/></div>
          <section className="records-card sync-card"><div className="section-heading"><div><h2>Operation queue</h2><p>Each local change receives a unique operation ID.</p></div><button className="text-button" onClick={refreshOperations}>Refresh queue</button></div>
            {operations.length === 0 ? <p className="empty-state">No operations yet. Add, edit or delete a fictional record to create one.</p> : <div className="operation-list">{operations.map(op => <article className="operation-row" key={op.operationId}><div className="operation-icon">{op.status === 'pending' ? '◷' : op.status === 'conflict' ? '!' : '✓'}</div><div className="operation-main"><strong>{op.details?.label || `${op.type} · ${op.recordId}`}</strong><small>{new Date(op.createdAt).toLocaleString()} · ID {op.operationId.slice(0, 12)}</small>{op.status === 'conflict' && <p className="conflict-detail">Local version: {op.details?.localVersion}. Example server version: {op.details?.remoteVersion}. This is a fictional conflict scenario.</p>}</div><span className={`status-pill ${op.status}`}>{op.status.replaceAll('-', ' ')}</span>{op.status === 'conflict' && <button className="button button-light review-button" onClick={() => resolveDemoConflict(op)}>Mark reviewed</button>}</article>)}</div>}
            <div className="sync-footer"><span>Last demo acknowledgement: {lastDemoSync ? new Date(lastDemoSync).toLocaleString() : 'Not run'}</span><button className="button button-light" onClick={createConflictExample}>Add conflict example</button></div>
          </section>
          <p className="disclaimer">A real deployment needs an authenticated backend, server-side authorization, idempotent sync operations, version checks, conflict resolution, backups and a security review.</p>
        </> : page === 'OPD queue' ? <>
          <div className="page-heading"><div><p className="eyebrow">LOCAL OUTPATIENT WORKFLOW</p><h1>OPD queue</h1><p className="subheading">A device-local waiting list for fictional demonstration records.</p></div><span className="queue-summary">{waitingCount} waiting · {consultingCount} consulting</span></div>
          <div className="sync-warning"><strong>Local queue only — no other device can see it.</strong><p>Queue changes are saved in this browser's IndexedDB and added to the demo operation queue. They are not sent to a clinic server.</p></div>
          <section className="records-card"><div className="section-heading"><div><h2>Today's queue</h2><p>Move each fictional visit through Waiting, Consulting and Completed.</p></div><button className="text-button" onClick={() => setPage('Patient records')}>Choose a patient</button></div>
            {opdQueue.length === 0 ? <p className="empty-state">The queue is empty. Open Patient records and select “Add to queue” for a fictional patient.</p> : <div className="operation-list">{opdQueue.map(item => <article className="operation-row" key={item.queueId}><div className="operation-icon">{item.status === 'Waiting' ? '◷' : item.status === 'Consulting' ? '＋' : '✓'}</div><div className="operation-main"><strong>{item.patientName}</strong><small>Added {new Date(item.createdAt).toLocaleString()} · Local queue ID {item.queueId.slice(0, 12)}</small><small>Patient record ID: {item.patientId}</small></div><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>{item.status !== 'Completed' && <button className="button button-light review-button" onClick={() => advanceQueue(item)}>{item.status === 'Waiting' ? 'Start consultation' : 'Mark completed'}</button>}</article>)}</div>}
          </section>
          <p className="disclaimer">Fictional data only. The queue is stored on this device and is not a real-time shared clinic queue.</p>
        </> : page === 'Health review' ? <>
          <div className="page-heading"><div><p className="eyebrow">HEALTH REVIEW</p><h1>Records to review</h1><p className="subheading">A rule-based view of fictional measurements, not a clinical assessment.</p></div><button className="button button-primary" onClick={openNew}>＋ Add record</button></div>
          <div className="review-list">{enriched.filter(p => p.risk !== 'Routine').map(p => <article className="review-row" key={p.id}><span className={`risk-pill ${p.risk.toLowerCase()}`}>{p.risk}</span><div><strong>{p.name}</strong><p>{p.heartRate} bpm heart rate · {p.bloodSugar} mg/dL blood sugar · {p.oxygen}% oxygen</p></div><button className="text-button" onClick={() => openEdit(p)}>Edit record</button></article>)}{enriched.every(p => p.risk === 'Routine') && <p className="empty-state">No sample records currently meet the dashboard's demonstration rules.</p>}</div>
        </> : <>
          <div className="page-heading"><div><p className="eyebrow">{page === 'Patient records' ? 'RECORD DIRECTORY' : 'YOUR WORKSPACE'}</p><h1>{page === 'Patient records' ? 'Patient records' : 'Good day, welcome back.'}</h1><p className="subheading">{page === 'Patient records' ? 'Browse and update fictional records stored locally.' : 'A simple view of sample records and offline status.'}</p></div><button className="button button-primary" onClick={openNew}>＋ Add patient</button></div>
          {page === 'Overview' && <><div className="stat-grid"><StatCard label="Total records" value={stats.total} detail="Stored in this browser" symbol="♙" tone="sage"/><StatCard label="Routine" value={stats.routine} detail="Demo rule category" symbol="✓" tone="green"/><StatCard label="Monitor" value={stats.monitor} detail="Review sample values" symbol="◷" tone="amber"/><StatCard label="Review" value={stats.review} detail="Check sample values" symbol="!" tone="rose"/></div><section className="welcome-panel"><div><p className="eyebrow">OFFLINE-FIRST DEMO</p><h2>Keep working. Know what is saved.</h2><p>Local changes remain on this browser and appear in the sync queue until reviewed in the demo.</p></div><div className="welcome-symbol">↻</div></section></>}
          <section className="records-card"><div className="section-heading"><div><h2>{page === 'Patient records' ? 'All patient records' : 'Recent records'}</h2><p>{filtered.length} record{filtered.length === 1 ? '' : 's'} shown</p></div><button className="text-button" onClick={resetDemo}>Reset sample data</button></div><div className="table-tools"><label className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, gender, notes..."/></label><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by review category"><option>All</option><option>Routine</option><option>Monitor</option><option>Review</option></select></div>
            <div className="table-scroll"><table><thead><tr><th>NAME</th><th>HEART RATE</th><th>BLOOD SUGAR</th><th>OXYGEN</th><th>LAST VISIT</th><th>REVIEW</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="person-cell"><span className="avatar">{p.name.split(' ').map(s => s[0]).join('').slice(0,2)}</span><span><strong>{p.name}</strong><small>{p.age} years · {p.gender}</small></span></div></td><td>{p.heartRate} <small className="unit">bpm</small></td><td>{p.bloodSugar} <small className="unit">mg/dL</small></td><td>{p.oxygen}%</td><td>{p.lastVisit || '—'}</td><td><span className={`risk-pill ${p.risk.toLowerCase()}`}>{p.risk}</span></td><td><div className="row-actions"><button aria-label={`Add ${p.name} to OPD queue`} onClick={() => addToQueue(p)}>Add to queue</button><button aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}>Edit</button><button aria-label={`Delete ${p.name}`} onClick={() => deletePatient(p.id)}>Delete</button></div></td></tr>)}</tbody></table></div>
            {filtered.length === 0 && <p className="empty-state">No records match your search. Try another name or clear the filter.</p>}</section><p className="disclaimer">Fictional data only · Demo categories are not medical advice and must not be used for diagnosis.</p>
        </>}
      </section>
    </main>
    {notice && <div className="toast" role="status">{notice}</div>}
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><form className="patient-form" onSubmit={savePatient}><div className="modal-heading"><div><p className="eyebrow">{editingId !== null ? 'EDIT ENTRY' : 'NEW ENTRY'}</p><h2>{editingId !== null ? 'Update patient record' : 'Add a patient record'}</h2></div><button type="button" className="close-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div><p className="form-warning">Fictional data only. Records are stored locally in this browser; no server is connected.</p><div className="form-grid"><Field label="Full name" name="name" value={form.name} onChange={setForm} required/><Field label="Age" name="age" value={form.age} onChange={setForm} type="number" min="1" max="120" required/><label className="field"><span>Gender</span><select value={form.gender} onChange={e => setForm({...form, gender:e.target.value})}><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></label><Field label="Heart rate (bpm)" name="heartRate" value={form.heartRate} onChange={setForm} type="number" min="20" max="250" required/><Field label="Blood pressure" name="bloodPressure" value={form.bloodPressure} onChange={setForm} placeholder="e.g. 120/80" required/><Field label="Blood sugar (mg/dL)" name="bloodSugar" value={form.bloodSugar} onChange={setForm} type="number" min="20" max="800" required/><Field label="Oxygen (%)" name="oxygen" value={form.oxygen} onChange={setForm} type="number" min="50" max="100" required/><Field label="Sleep (hours)" name="sleep" value={form.sleep} onChange={setForm} type="number" min="0" max="24" step="0.1" required/><Field label="Last visit" name="lastVisit" value={form.lastVisit} onChange={setForm} type="date"/><label className="field"><span>Status</span><select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option>Active</option><option>Follow-up</option><option>Archived</option></select></label><label className="field field-wide"><span>Notes</span><textarea rows="3" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Short note for this fictional record"/></label></div><div className="form-actions"><button type="button" className="button button-light" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button button-primary">Save locally</button></div></form></div>}
  </div>;
}

function StatCard({ label, value, detail, symbol, tone }) { return <article className="stat-card"><div className={`stat-symbol ${tone}`}>{symbol}</div><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>; }
function Field({ label, name, value, onChange, type = 'text', ...props }) { return <label className="field"><span>{label}</span><input name={name} type={type} value={value} onChange={e => onChange(current => ({...current,[name]:e.target.value}))} {...props}/></label>; }
export default App;
