// src/components/EditProfile.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function EditProfile({ onClose, onUpdate }) {
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    height: '',
    weight: '',
    birth_date: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        username: data.username || '',
        full_name: data.full_name || '',
        bio: data.bio || '',
        height: data.height || '',
        weight: data.weight || '',
        birth_date: data.birth_date || '',
        gender: data.gender || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null,
        birth_date: profile.birth_date || null,
        gender: profile.gender || null,
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert('Error saving profile: ' + error.message);
    } else {
      onUpdate?.();
      onClose();
    }
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-black animate-fade-in pb-24">
        <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
          <button onClick={onClose} className="text-blue-500 text-sm font-medium">Cancel</button>
          <h2 className="text-white font-semibold">Edit Profile</h2>
          <div className="w-10"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#9e9e9e] text-sm">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
        <button onClick={onClose} className="text-blue-500 text-sm font-medium">Cancel</button>
        <h2 className="text-white font-semibold">Edit Profile</h2>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="text-blue-500 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Username */}
        <div>
          <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
            Username
          </label>
          <input
            type="text"
            placeholder="your_username"
            className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
            value={profile.username}
            onChange={(e) => handleChange('username', e.target.value)}
          />
        </div>

        {/* Full Name */}
        <div>
          <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
            Full Name
          </label>
          <input
            type="text"
            placeholder="Your full name"
            className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
            value={profile.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
            Bio
          </label>
          <textarea
            placeholder="Tell us about yourself..."
            rows={3}
            className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors resize-none"
            value={profile.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
          />
        </div>

        {/* Height & Weight Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
              Height (cm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="175"
              className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
              value={profile.height}
              onChange={(e) => handleChange('height', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
            />
          </div>
          <div>
            <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
              Weight (kg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="70"
              className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
              value={profile.weight}
              onChange={(e) => handleChange('weight', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
            />
          </div>
        </div>

        {/* Birth Date */}
        <div>
          <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
            Birth Date
          </label>
          <input
            type="date"
            className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
            value={profile.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="text-[#9e9e9e] text-xs font-bold uppercase mb-2 block tracking-[0.18em]">
            Gender
          </label>
          <select
            className="w-full bg-[#1c1c1e] text-white p-3 rounded-xl outline-none border border-[#333333] focus:border-blue-500 transition-colors"
            value={profile.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}