import React, { useState, useEffect, useMemo } from 'react';
import { Novel } from '../types';

interface DailyGoalTrackerProps {
  novel: Novel;
  onGoalChange: (goal: number) => void;
}

const DailyGoalTracker: React.FC<DailyGoalTrackerProps> = ({ novel, onGoalChange }) => {
  const [goalInput, setGoalInput] = useState<string>(novel.dailyGoal?.toString() || '500');

  useEffect(() => {
    setGoalInput(novel.dailyGoal?.toString() || '500');
  }, [novel.dailyGoal]);

  const handleGoalBlur = () => {
    const newGoal = parseInt(goalInput, 10);
    if (!isNaN(newGoal) && newGoal > 0) {
      onGoalChange(newGoal);
    } else {
      setGoalInput(novel.dailyGoal?.toString() || '500');
    }
  };

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const wordsToday = novel.writingHistory?.[today] || 0;
  const goal = novel.dailyGoal || 500;
  const progress = goal > 0 ? Math.min((wordsToday / goal) * 100, 100) : 0;
  
  const calendarDays = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  }, []);

  const getDayClass = (day: Date | null) => {
    if (!day) return 'bg-primary';
    const dateString = day.toISOString().split('T')[0];
    const wordsWritten = novel.writingHistory?.[dateString] || 0;
    
    if (wordsWritten === 0) return 'bg-slate-700';
    if (wordsWritten >= goal) return 'bg-green-600';
    return 'bg-yellow-600';
  };

  return (
    <div className="space-y-3">
        <h3 className="text-md font-semibold">Daily Goal</h3>
        <div>
            <label htmlFor="daily-goal" className="block text-xs font-medium text-text-secondary">Words / Day</label>
            <input
                id="daily-goal"
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={handleGoalBlur}
                className="w-full bg-primary border border-slate-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
        </div>
        <div>
            <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>Today's Progress</span>
                <span>{wordsToday} / {goal}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-accent h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
        <div>
             <div className="grid grid-cols-7 text-center text-xs text-text-secondary">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
                {calendarDays.map((day, index) => (
                    <div
                        key={index}
                        className={`w-full aspect-square rounded ${getDayClass(day)}`}
                        title={day ? `${day.toLocaleDateString()}: ${novel.writingHistory?.[day.toISOString().split('T')[0]] || 0} words` : ''}
                    >
                         {day && <span className="text-xs p-1">{day.getDate()}</span>}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default DailyGoalTracker;
