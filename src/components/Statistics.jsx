// src/components/Statistics.jsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function Statistics({ onClose }) {
  const [timeRange, setTimeRange] = useState('week'); // week, month, year, all
  const [workoutData, setWorkoutData] = useState([]);
  const [exerciseStats, setExerciseStats] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, exercises, records

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date('2000-01-01');

    // Fetch workout sessions in range
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select(`
        id, name, start_time, end_time,
        workout_logs (exercise_id, weight, reps, set_number, exercises(name))
      `)
      .eq('user_id', user.id)
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: true });

    if (sessions) {
      setWorkoutData(sessions);

      // Calculate exercise stats
      const exMap = {};
      sessions.forEach(session => {
        session.workout_logs?.forEach(log => {
          const exName = log.exercises?.name || 'Unknown';
          if (!exMap[exName]) {
            exMap[exName] = { name: exName, totalSets: 0, totalReps: 0, totalVolume: 0, maxWeight: 0 };
          }
          exMap[exName].totalSets++;
          exMap[exName].totalReps += log.reps || 0;
          exMap[exName].totalVolume += (log.weight || 0) * (log.reps || 0);
          exMap[exName].maxWeight = Math.max(exMap[exName].maxWeight, log.weight || 0);
        });
      });
      setExerciseStats(Object.values(exMap).sort((a, b) => b.totalVolume - a.totalVolume));

      // Calculate personal records (max weight per exercise)
      const prMap = {};
      sessions.forEach(session => {
        session.workout_logs?.forEach(log => {
          const exName = log.exercises?.name || 'Unknown';
          if (!prMap[exName] || (log.weight || 0) > prMap[exName].weight) {
            prMap[exName] = { name: exName, weight: log.weight || 0, reps: log.reps || 0, date: session.start_time };
          }
        });
      });
      setPersonalRecords(Object.values(prMap).sort((a, b) => b.weight - a.weight));
    }

    setLoading(false);
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    const grouped = {};
    workoutData.forEach(session => {
      const date = new Date(session.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (!grouped[date]) grouped[date] = { date, volume: 0, duration: 0, sets: 0 };

      const start = new Date(session.start_time);
      const end = session.end_time ? new Date(session.end_time) : start;
      grouped[date].duration += (end - start) / (1000 * 60); // minutes
      grouped[date].sets += session.workout_logs?.length || 0;

      session.workout_logs?.forEach(log => {
        grouped[date].volume += (log.weight || 0) * (log.reps || 0);
      });
    });
    return Object.values(grouped);
  }, [workoutData]);

  const totalWorkouts = workoutData.length;
  const totalVolume = exerciseStats.reduce((sum, ex) => sum + ex.totalVolume, 0);
  const totalSets = exerciseStats.reduce((sum, ex) => sum + ex.totalSets, 0);
  const totalDuration = chartData.reduce((sum, d) => sum + d.duration, 0);

  // Simple bar chart SVG
  const BarChart = ({ data, color, labelKey, valueKey }) => {
    if (!data.length) return <div className="text-[#9e9e9e] text-sm text-center py-8">No data available</div>;
    const maxVal = Math.max(...data.map(d => d[valueKey]));
    const barWidth = Math.max(20, 300 / data.length);

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${data.length * (barWidth + 8)} 160`} className="w-full" style={{ minWidth: data.length * 40 }}>
          {data.map((d, i) => {
            const height = maxVal > 0 ? (d[valueKey] / maxVal) * 120 : 0;
            return (
              <g key={i} transform={`translate(${i * (barWidth + 8)}, 0)`}>
                <rect x="0" y={140 - height} width={barWidth} height={height} rx="4" fill={color} opacity="0.8" />
                <text x={barWidth / 2} y={140 - height - 6} textAnchor="middle" fill="white" fontSize="10" fontWeight="500">
                  {d[valueKey] >= 1000 ? (d[valueKey] / 1000).toFixed(1) + 'k' : d[valueKey].toFixed(0)}
                </text>
                <text x={barWidth / 2} y={155} textAnchor="middle" fill="#9e9e9e" fontSize="9">
                  {d[labelKey]}
                </text>
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
        <h2 className="text-white font-semibold">Statistics</h2>
        <div className="w-10"></div>
      </div>

      {/* Time Range Filter */}
      <div className="px-4 py-3 flex gap-2">
        {['week', 'month', 'year', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              timeRange === range ? 'bg-blue-500 text-white' : 'bg-[#1c1c1e] text-[#9e9e9e] hover:text-white'
            }`}
          >
            {range === 'all' ? 'All time' : `This ${range}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#9e9e9e] text-sm">Loading statistics...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="px-4 grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs font-medium">Workouts</span>
              <div className="text-white text-2xl font-bold mt-1">{totalWorkouts}</div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs font-medium">Total Volume</span>
              <div className="text-white text-2xl font-bold mt-1">
                {totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + 'k' : totalVolume} kg
              </div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs font-medium">Total Sets</span>
              <div className="text-white text-2xl font-bold mt-1">{totalSets}</div>
            </div>
            <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
              <span className="text-[#9e9e9e] text-xs font-medium">Duration</span>
              <div className="text-white text-2xl font-bold mt-1">{Math.round(totalDuration)} min</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 flex gap-2 mb-4 border-b border-[#333333]">
            {['overview', 'exercises', 'records'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-2 text-sm font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab ? 'text-blue-500 border-blue-500' : 'text-[#9e9e9e] border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="px-4 pb-6">
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Volume Chart */}
                <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                  <h3 className="text-white font-semibold mb-4">Volume per Day (kg)</h3>
                  <BarChart data={chartData} color="#3b82f6" labelKey="date" valueKey="volume" />
                </div>

                {/* Sets Chart */}
                <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                  <h3 className="text-white font-semibold mb-4">Sets per Day</h3>
                  <BarChart data={chartData} color="#10b981" labelKey="date" valueKey="sets" />
                </div>

                {/* Duration Chart */}
                <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                  <h3 className="text-white font-semibold mb-4">Duration per Day (min)</h3>
                  <BarChart data={chartData} color="#f59e0b" labelKey="date" valueKey="duration" />
                </div>
              </div>
            )}

            {activeTab === 'exercises' && (
              <div className="flex flex-col gap-3">
                {exerciseStats.length === 0 ? (
                  <div className="text-[#9e9e9e] text-sm text-center py-8">No exercise data yet</div>
                ) : (
                  exerciseStats.map((ex, i) => (
                    <div key={i} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-bold">{ex.name}</h4>
                        <span className="text-blue-500 text-sm font-semibold">{ex.maxWeight} kg PR</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-white font-semibold">{ex.totalSets}</div>
                          <div className="text-[#9e9e9e] text-xs">Sets</div>
                        </div>
                        <div>
                          <div className="text-white font-semibold">{ex.totalReps}</div>
                          <div className="text-[#9e9e9e] text-xs">Reps</div>
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            {ex.totalVolume >= 1000 ? (ex.totalVolume / 1000).toFixed(1) + 'k' : ex.totalVolume}
                          </div>
                          <div className="text-[#9e9e9e] text-xs">Volume</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'records' && (
              <div className="flex flex-col gap-3">
                {personalRecords.length === 0 ? (
                  <div className="text-[#9e9e9e] text-sm text-center py-8">No personal records yet</div>
                ) : (
                  personalRecords.map((pr, i) => (
                    <div key={i} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333] flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-bold">{pr.name}</h4>
                        <p className="text-[#9e9e9e] text-xs mt-1">
                          {new Date(pr.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-500 text-xl font-bold">{pr.weight} kg</div>
                        <div className="text-[#9e9e9e] text-xs">{pr.reps} reps</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}