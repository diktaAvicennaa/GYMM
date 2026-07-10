// src/components/BodyMeasurements.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function BodyMeasurements({ onClose }) {
  const [measurements, setMeasurements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    body_fat: '',
    chest: '',
    waist: '',
    arms: '',
    thighs: '',
    shoulders: '',
    notes: ''
  });

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (!error && data) {
      setMeasurements(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.date) return alert('Date is required!');

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('body_measurements')
      .insert([{
        user_id: user.id,
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : null,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
        chest: form.chest ? parseFloat(form.chest) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        arms: form.arms ? parseFloat(form.arms) : null,
        thighs: form.thighs ? parseFloat(form.thighs) : null,
        shoulders: form.shoulders ? parseFloat(form.shoulders) : null,
        notes: form.notes || null
      }]);

    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      setShowForm(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        weight: '', body_fat: '', chest: '', waist: '', arms: '', thighs: '', shoulders: '', notes: ''
      });
      fetchMeasurements();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this measurement?')) return;
    const { error } = await supabase.from('body_measurements').delete().eq('id', id);
    if (!error) fetchMeasurements();
  };

  const sanitizeDecimal = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  // Simple weight trend chart
  const WeightChart = () => {
    const weightData = measurements.filter(m => m.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (weightData.length < 2) return null;

    const minWeight = Math.min(...weightData.map(d => d.weight));
    const maxWeight = Math.max(...weightData.map(d => d.weight));
    const range = maxWeight - minWeight || 1;

    const points = weightData.map((d, i) => {
      const x = (i / (weightData.length - 1)) * 280 + 10;
      const y = 140 - ((d.weight - minWeight) / range) * 120;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333] mb-4">
        <h3 className="text-white font-semibold mb-3">Weight Trend</h3>
        <svg viewBox="0 0 300 160" className="w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line key={p} x1="10" y1={20 + p * 120} x2="290" y2={20 + p * 120} stroke="#333333" strokeWidth="0.5" />
          ))}
          {/* Line */}
          <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
          {/* Points */}
          {weightData.map((d, i) => {
            const x = (i / (weightData.length - 1)) * 280 + 10;
            const y = 140 - ((d.weight - minWeight) / range) * 120;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                <text x={x} y={y - 8} textAnchor="middle" fill="white" fontSize="9">{d.weight}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
        <button onClick={onClose} className="text-blue-500 text-sm font-medium">Back</button>
        <h2 className="text-white font-semibold">Body Measurements</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-blue-500 text-sm font-medium"
        >
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-4 bg-[#1c1c1e] border-b border-[#333333]">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Date</label>
              <input
                type="date"
                className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500"
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Weight (kg)</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.weight} onChange={(e) => setForm({...form, weight: sanitizeDecimal(e.target.value)})} />
              </div>
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Body Fat %</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.body_fat} onChange={(e) => setForm({...form, body_fat: sanitizeDecimal(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Chest (cm)</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.chest} onChange={(e) => setForm({...form, chest: sanitizeDecimal(e.target.value)})} />
              </div>
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Waist (cm)</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.waist} onChange={(e) => setForm({...form, waist: sanitizeDecimal(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Arms (cm)</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.arms} onChange={(e) => setForm({...form, arms: sanitizeDecimal(e.target.value)})} />
              </div>
              <div>
                <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Thighs (cm)</label>
                <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.thighs} onChange={(e) => setForm({...form, thighs: sanitizeDecimal(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Shoulders (cm)</label>
              <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500" value={form.shoulders} onChange={(e) => setForm({...form, shoulders: sanitizeDecimal(e.target.value)})} />
            </div>
            <div>
              <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-1 block">Notes</label>
              <textarea rows={2} placeholder="Optional notes..." className="w-full bg-black text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 resize-none" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Measurement'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <div className="text-[#9e9e9e] text-sm text-center py-8">Loading measurements...</div>
        ) : measurements.length === 0 ? (
          <div className="text-[#9e9e9e] text-sm text-center py-8">No measurements yet. Add your first one!</div>
        ) : (
          <>
            <WeightChart />
            <h3 className="text-[#9e9e9e] text-sm font-medium mb-3">History</h3>
            <div className="flex flex-col gap-3">
              {measurements.map((m) => (
                <div key={m.id} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-bold">{new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => handleDelete(m.id)} className="text-[#6b6b6b] hover:text-red-500 transition-colors">
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {m.weight && (
                      <div>
                        <div className="text-white font-semibold">{m.weight} kg</div>
                        <div className="text-[#9e9e9e] text-xs">Weight</div>
                      </div>
                    )}
                    {m.body_fat && (
                      <div>
                        <div className="text-white font-semibold">{m.body_fat}%</div>
                        <div className="text-[#9e9e9e] text-xs">Body Fat</div>
                      </div>
                    )}
                    {m.chest && (
                      <div>
                        <div className="text-white font-semibold">{m.chest} cm</div>
                        <div className="text-[#9e9e9e] text-xs">Chest</div>
                      </div>
                    )}
                    {m.waist && (
                      <div>
                        <div className="text-white font-semibold">{m.waist} cm</div>
                        <div className="text-[#9e9e9e] text-xs">Waist</div>
                      </div>
                    )}
                    {m.arms && (
                      <div>
                        <div className="text-white font-semibold">{m.arms} cm</div>
                        <div className="text-[#9e9e9e] text-xs">Arms</div>
                      </div>
                    )}
                    {m.thighs && (
                      <div>
                        <div className="text-white font-semibold">{m.thighs} cm</div>
                        <div className="text-[#9e9e9e] text-xs">Thighs</div>
                      </div>
                    )}
                    {m.shoulders && (
                      <div>
                        <div className="text-white font-semibold">{m.shoulders} cm</div>
                        <div className="text-[#9e9e9e] text-xs">Shoulders</div>
                      </div>
                    )}
                  </div>
                  {m.notes && <p className="text-[#9e9e9e] text-xs mt-2">{m.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}