import { motion } from "framer-motion";
import { PieChart, Users, TrendingUp } from "lucide-react";

export function AnalyticsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Metric Card 1 */}
      <div className="bg-white rounded-xl shadow-soft p-6 min-h-[200px] flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold text-primary">92%</div>
          <div className="text-gray-500 mt-2">Lesson Completion</div>
        </div>
        <div className="text-xs text-gray-400 mt-4">+5% this week</div>
      </div>
      {/* Metric Card 2 */}
      <div className="bg-white rounded-xl shadow-soft p-6 min-h-[200px] flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold text-accent">18</div>
          <div className="text-gray-500 mt-2">Active Students</div>
        </div>
        <div className="text-xs text-gray-400 mt-4">+2 new</div>
      </div>
      {/* Metric Card 3: Fluency List */}
      <div className="bg-white rounded-xl shadow-soft p-6 min-h-[200px] flex flex-col justify-between">
        <div>
          <div className="font-bold text-primary mb-2">Fluency List</div>
          <ul className="overflow-y-auto max-h-32 pr-2 text-sm space-y-1">
            <li>Jane: 98%</li>
            <li>Sam: 95%</li>
            <li>Alex: 93%</li>
            <li>Chris: 90%</li>
            <li>Pat: 88%</li>
            <li>Jordan: 85%</li>
            <li>Casey: 82%</li>
            <li>Riley: 80%</li>
          </ul>
        </div>
        <div className="text-xs text-gray-400 mt-4">Top 8 students</div>
      </div>
    </div>
  );
}
