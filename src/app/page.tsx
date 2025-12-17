'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import data from '../data/fpl_data.json';
import {
  AnimatedCard,
  AnimatedListItem,
  AnimatedBadge,
  AnimatedHeader,
  ThemeToggle,
  SectionTitle
} from '../components/AnimatedComponents';
import { TeamDisplay } from '../components/TeamDisplay';

export default function Home() {
  const { meta, standings, chips, captains, transfers, differentials, squads, teams_meta } = data as any;
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check system preference on mount
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    // Update document class when theme changes
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300';
  };

  return (
    <main className="min-h-screen mesh-gradient text-gray-900 dark:text-gray-100 transition-colors duration-500">
      <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />

      {/* Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <AnimatedHeader
          title={meta.league_name}
          subtitle={`Gameweek ${meta.gameweek} Report`}
          lastUpdated={meta.last_updated}
        />

        {/* League Table */}
        <AnimatedCard delay={1}>
          <SectionTitle icon="📊" title="League Standings" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-dark-600">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Manager</th>
                  <th className="pb-3 hidden sm:table-cell">Team</th>
                  <th className="pb-3 text-right pr-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((manager: any, index: number) => (
                  <motion.tr
                    key={manager.manager}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="table-row-hover border-b border-gray-100 dark:border-dark-700 last:border-0"
                  >
                    <td className="py-4 pl-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankStyle(manager.rank)}`}>
                        {manager.rank}
                      </span>
                    </td>
                    <td className="py-4 font-medium">{manager.manager}</td>
                    <td className="py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{manager.team_name}</td>
                    <td className="py-4 text-right pr-2">
                      <span className="font-bold text-lg gradient-text">{manager.total_points}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>

        {/* Teams Display */}
        {squads && teams_meta && (
          <AnimatedCard delay={1.5}>
            <SectionTitle icon="⚽" title="Teams" />
            <TeamDisplay
              squads={squads}
              teamsMeta={teams_meta}
              managers={standings.map((s: any) => s.manager)}
            />
          </AnimatedCard>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Captains */}
          <AnimatedCard delay={2}>
            <SectionTitle icon="🎯" title="Captains" />
            <ul className="space-y-3">
              {Object.entries(captains).map(([manager, captain], index) => (
                <AnimatedListItem key={manager} index={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                  <span className="text-gray-700 dark:text-gray-300">{manager}</span>
                  <AnimatedBadge variant="accent">
                    {captain as string}
                  </AnimatedBadge>
                </AnimatedListItem>
              ))}
            </ul>
          </AnimatedCard>

          {/* Chips */}
          <AnimatedCard delay={3}>
            <SectionTitle icon="🎲" title="Chips Played" />
            <ul className="space-y-3">
              {Object.entries(chips).map(([manager, chip], index) => (
                <AnimatedListItem key={manager} index={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                  <span className="text-gray-700 dark:text-gray-300">{manager}</span>
                  <AnimatedBadge variant={chip ? 'success' : 'neutral'}>
                    {chip ? (chip as string).toUpperCase() : 'None'}
                  </AnimatedBadge>
                </AnimatedListItem>
              ))}
            </ul>
          </AnimatedCard>
        </div>

        {/* Transfers */}
        <AnimatedCard delay={4}>
          <SectionTitle icon="🔁" title="Transfers" />
          <div className="space-y-4">
            {Object.entries(transfers).map(([manager, transferList], index) => (
              <motion.div
                key={manager}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-gray-100 dark:border-dark-700 last:border-0 pb-4 last:pb-0"
              >
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">{manager}</h3>
                {(transferList as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(transferList as any[]).map((t, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                          {t.in}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          </svg>
                          {t.out}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No transfers made</p>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Differentials */}
        <AnimatedCard delay={5}>
          <SectionTitle icon="⚡" title="Differentials" />

          <div className="space-y-6">
            {/* Unique Differentials */}
            <div>
              <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"></span>
                Owned by only 1 manager
              </h3>
              <div className="grid gap-3">
                {Object.entries(differentials.unique).map(([manager, players], index) => (
                  <motion.div
                    key={manager}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-dark-700/50"
                  >
                    <span className="font-semibold min-w-[140px] text-gray-800 dark:text-gray-200">{manager}</span>
                    <div className="flex flex-wrap gap-2">
                      {(players as string[]).map((player, i) => (
                        <span key={i} className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                          {player}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Duo Differentials */}
            {Object.keys(differentials.duo).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-accent-600 dark:text-accent-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-500 to-primary-500"></span>
                  Owned by exactly 2 managers
                </h3>
                <div className="grid gap-3">
                  {Object.entries(differentials.duo).map(([manager, players], index) => (
                    <motion.div
                      key={manager}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-dark-700/50"
                    >
                      <span className="font-semibold min-w-[140px] text-gray-800 dark:text-gray-200">{manager}</span>
                      <div className="flex flex-wrap gap-2">
                        {(players as string[]).map((player, i) => (
                          <span key={i} className="text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 px-2 py-1 rounded-full">
                            {player}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center py-8 text-sm text-gray-500 dark:text-gray-400"
        >
          <p>Data updates automatically every 6 hours</p>
          <p className="mt-1 gradient-text font-medium">Built with ❤️ for FPL managers</p>
        </motion.footer>

      </div>
    </main>
  );
}
