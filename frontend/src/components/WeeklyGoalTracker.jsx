import { useState } from "react";

export function WeeklyGoalTracker() {
  const [goal, setGoal] = useState(5);
  const [completed, setCompleted] = useState(2);

  const percent = Math.min(100, Math.round((completed / goal) * 100));

  return (
    <div className="bg-white rounded-xl shadow-soft p-4 flex flex-col md:flex-row items-center gap-4 my-4">
      <div className="flex-1">
        <h2 className="font-bold text-lg text-primary mb-1">Weekly Goal</h2>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm text-gray-600">Goal:</label>
          <input
            type="number"
            min={1}
            value={goal}
            onChange={e => setGoal(Number(e.target.value))}
            className="border rounded px-2 py-1 w-16 text-center"
          />
          <span className="text-sm text-gray-500">tasks</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm text-gray-600">Completed:</label>
          <input
            type="number"
            min={0}
            max={goal}
            value={completed}
            onChange={e => setCompleted(Number(e.target.value))}
            className="border rounded px-2 py-1 w-16 text-center"
          />
        </div>
        <progress value={completed} max={goal} className="w-full h-3 rounded bg-softbg [&::-webkit-progress-bar]:bg-softbg [&::-webkit-progress-value]:bg-accent"></progress>
        <div className="text-xs text-gray-500 mt-1">{percent}% complete</div>
      </div>
    </div>
  );
} 