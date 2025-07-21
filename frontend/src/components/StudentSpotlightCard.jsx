export function StudentSpotlightCard() {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6 flex items-center gap-4 my-4 min-h-[120px]">
        <img
          src="https://randomuser.me/api/portraits/lego/1.jpg"
          alt="Student Avatar"
          className="w-16 h-16 rounded-full border-2 border-accent"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">Aarav Sharma</span>
            <span className="text-2xl">🎉</span>
          </div>
          <div className="text-gray-600 text-sm mt-1">Achievement: Top Scorer in Reading Fluency</div>
        </div>
      </div>
    );
  } 