// src/components/WorkoutCalendar.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function WorkoutCalendar({ onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutDays, setWorkoutDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayWorkouts, setDayWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutDays();
  }, [currentDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchDayWorkouts(selectedDate);
    }
  }, [selectedDate]);

  const fetchWorkoutDays = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data } = await supabase
      .from('workout_sessions')
      .select('start_time')
      .eq('user_id', user.id)
      .gte('start_time', startOfMonth.toISOString())
      .lte('start_time', endOfMonth.toISOString());

    if (data) {
      const days = data.map(d => new Date(d.start_time).getDate());
      setWorkoutDays([...new Set(days)]);
    }
    setLoading(false);
  };

  const fetchDayWorkouts = async (date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('workout_sessions')
      .select(`
        id, name, start_time, end_time,
        workout_logs (exercise_id, weight, reps, set_number, exercises(name))
      `)
      .eq('user_id', user.id)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    setDayWorkouts(data || []);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="flex flex-col h-full bg-black animate-fade-in pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#1c1c1e] border-b border-[#333333] sticky top-0 z-10">
        <button onClick={onClose} className="text-blue-500 text-sm font-medium">Back</button>
        <h2 className="text-white font-semibold">Workout Calendar</h2>
        <div className="w-10"></div>
      </div>

      {/* Calendar Navigation */}
      <div className="px-4 py-4 flex justify-between items-center">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1c1c1e] text-white hover:bg-[#252525] transition-colors">
          <i className="fas fa-chevron-left"></i>
        </button>
        <h3 className="text-white font-bold text-lg">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1c1c1e] text-white hover:bg-[#252525] transition-colors">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Day Names */}
      <div className="px-4 grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[#9e9e9e] text-xs font-medium py-2">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="px-4 grid grid-cols-7 gap-1">
        {/* Empty cells for days before start of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square"></div>
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
          const hasWorkout = workoutDays.includes(day);
          const isSelected = selectedDate && new Date(selectedDate).getDate() === day && new Date(selectedDate).getMonth() === currentDate.getMonth();

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                isSelected 
                  ? 'bg-blue-500 text-white' 
                  : isToday 
                    ? 'bg-[#1c1c1e] text-blue-500 border border-blue-500' 
                    : 'bg-[#1c1c1e] text-white hover:bg-[#252525]'
              }`}
            >
              {day}
              {hasWorkout && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs text-[#9e9e9e]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Workout day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full border border-blue-500"></div>
          <span>Today</span>
        </div>
      </div>

      {/* Selected Day Workouts */}
      {selectedDate && (
        <div className="px-4 py-4 border-t border-[#333333]">
          <h3 className="text-white font-semibold mb-3">
            {selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>

          {dayWorkouts.length === 0 ? (
            <div className="text-[#9e9e9e] text-sm py-4">No workouts on this day</div>
          ) : (
            <div className="flex flex-col gap-3">
              {dayWorkouts.map((workout) => {
                const duration = workout.end_time 
                  ? Math.round((new Date(workout.end_time) - new Date(workout.start_time)) / (1000 * 60))
                  : 0;
                const totalSets = workout.workout_logs?.length || 0;
                const totalVolume = workout.workout_logs?.reduce((sum, log) => sum + (log.weight || 0) * (log.reps || 0), 0) || 0;
                const uniqueExercises = [...new Set(workout.workout_logs?.map(l => l.exercises?.name) || [])];

                return (
                  <div key={workout.id} className="bg-[#1c1c1e] p-4 rounded-xl border border-[#333333]">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-bold">{workout.name}</h4>
                      <span className="text-[#9e9e9e] text-xs">
                        {new Date(workout.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm mb-2">
                      <span className="text-[#9e9e9e]">{duration} min</span>
                      <span className="text-[#9e9e9e]">{totalSets} sets</span>
                      <span className="text-[#9e9e9e]">{totalVolume} kg vol</span>
                    </div>
                    <p className="text-[#9e9e9e] text-xs line-clamp-2">
                      {uniqueExercises.join(', ') || 'No exercises logged'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary */}
      <div className="px-4 py-4 border-t border-[#333333]">
        <h3 className="text-[#9e9e9e] text-sm font-medium mb-3">Monthly Summary</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1c1c1e] p-3 rounded-xl text-center">
            <div className="text-white text-xl font-bold">{workoutDays.length}</div>
            <div className="text-[#9e9e9e] text-xs">Workout Days</div>
          </div>
          <div className="bg-[#1c1c1e] p-3 rounded-xl text-center">
            <div className="text-white text-xl font-bold">
              {Math.round((workoutDays.length / daysInMonth) * 100)}%
            </div>
            <div className="text-[#9e9e9e] text-xs">Consistency</div>
          </div>
          <div className="bg-[#1c1c1e] p-3 rounded-xl text-center">
            <div className="text-white text-xl font-bold">
              {new Date().getDate() - Math.max(...workoutDays, 0)}
            </div>
            <div className="text-[#9e9e9e] text-xs">Days Since Last</div>
          </div>
        </div>
      </div>
    </div>
  );
}