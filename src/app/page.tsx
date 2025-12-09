import data from '../data/fpl_data.json';
import RefreshButton from '../components/RefreshButton';

export default function Home() {
  const { meta, standings, chips, captains, transfers, differentials } = data;

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400">
            {meta.league_name}
          </h1>
          <p className="text-xl font-medium">Gameweek {meta.gameweek} Report</p>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-500">Last updated: {meta.last_updated}</p>
            <RefreshButton />
          </div>
        </header>

        {/* League Table */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
            📊 League Table
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Manager</th>
                  <th className="pb-2">Team</th>
                  <th className="pb-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {standings.map((manager) => (
                  <tr key={manager.manager} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 font-bold text-purple-600 dark:text-purple-400">
                      {manager.rank}
                    </td>
                    <td className="py-3">{manager.manager}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{manager.team_name}</td>
                    <td className="py-3 text-right font-bold">{manager.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Captains */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎯</span> Captains
            </h2>
            <ul className="space-y-2">
              {Object.entries(captains).map(([manager, captain]) => (
                <li key={manager} className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">{manager}</span>
                  <span className="font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm">
                    {captain as string}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Chips */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎲</span> Chips Played
            </h2>
            <ul className="space-y-2">
              {Object.entries(chips).map(([manager, chip]) => (
                <li key={manager} className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">{manager}</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                    chip 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {chip ? (chip as string).toUpperCase() : 'None'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Transfers */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🔁</span> Transfers
          </h2>
          <div className="space-y-4">
            {Object.entries(transfers).map(([manager, transferList]) => (
              <div key={manager} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <h3 className="font-semibold mb-2">{manager}</h3>
                {(transferList as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(transferList as any[]).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 font-medium">IN: {t.in}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">OUT: {t.out}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No transfers made</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Differentials */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>⚡</span> Differentials
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Owned by only 1 manager</h3>
              <div className="grid gap-3">
                {Object.entries(differentials.unique).map(([manager, players]) => (
                  <div key={manager} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-semibold min-w-[120px]">{manager}:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {(players as string[]).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(differentials.duo).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Owned by exactly 2 managers</h3>
                <div className="grid gap-3">
                  {Object.entries(differentials.duo).map(([manager, players]) => (
                    <div key={manager} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-semibold min-w-[120px]">{manager}:</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {(players as string[]).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
