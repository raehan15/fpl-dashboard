'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

// Types for squad data
interface Fixture {
  opponent: string;
  opponent_id: number;
  is_home: boolean;
}

interface Player {
  name: string;
  full_name: string;
  position: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  team_id: number;
  team_short: string;
  is_captain: boolean;
  is_vice: boolean;
  multiplier: number;
  fixture: Fixture;
  points?: number;
  raw_points?: number;
}

interface Squad {
  starting: Player[];
  bench: Player[];
  gw_points?: number;
}

interface TeamMeta {
  name: string;
  short: string;
  primary: string;
  secondary: string;
}

interface TeamDisplayProps {
  squads: Record<string, Squad>;
  teamsMeta: Record<string, TeamMeta>;
  managers: string[];
}

// Jersey SVG component with team colors
function Jersey({
  primaryColor,
  secondaryColor,
  isCaptain,
  isVice
}: {
  primaryColor: string;
  secondaryColor: string;
  isCaptain: boolean;
  isVice: boolean;
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 60 60"
        className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg"
      >
        {/* Jersey body */}
        <path
          d="M30 8 L20 12 L15 10 L5 18 L10 25 L15 22 L15 52 L45 52 L45 22 L50 25 L55 18 L45 10 L40 12 L30 8Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="1.5"
        />
        {/* Collar */}
        <path
          d="M25 10 L30 14 L35 10"
          fill="none"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Sleeve stripes */}
        <path
          d="M15 16 L10 20"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M45 16 L50 20"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Captain badge */}
      {isCaptain && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white">
          C
        </div>
      )}

      {/* Vice captain badge */}
      {isVice && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white">
          V
        </div>
      )}
    </div>
  );
}

// Individual player card
function PlayerCard({
  player,
  teamMeta,
  delay
}: {
  player: Player;
  teamMeta: TeamMeta;
  delay: number;
}) {
  const badgeStyle = "bg-gradient-to-r from-gray-700 to-gray-800 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-b-md";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center gap-0.5"
    >
      <Jersey
        primaryColor={teamMeta?.primary || '#888888'}
        secondaryColor={teamMeta?.secondary || '#FFFFFF'}
        isCaptain={player.is_captain}
        isVice={player.is_vice}
      />

      {/* Player name */}
      <div className="bg-gradient-to-b from-primary-600 to-primary-700 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-t-md whitespace-nowrap max-w-[80px] sm:max-w-[90px] truncate">
        {player.name}
      </div>

      {/* Show points if player has played (points > 0), otherwise show fixture */}
      {player.points !== undefined && player.points > 0 ? (
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-b-md">
          {player.points} pts
        </div>
      ) : (
        <div className="bg-transparent text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-b-md">
          {player.fixture.opponent} ({player.fixture.is_home ? 'H' : 'A'})
        </div>
      )}
    </motion.div>
  );
}

// Football pitch background with players
function Pitch({
  players,
  teamsMeta
}: {
  players: Player[];
  teamsMeta: Record<string, TeamMeta>;
}) {
  // Group players by position
  const goalkeepers = players.filter(p => p.position === 1);
  const defenders = players.filter(p => p.position === 2);
  const midfielders = players.filter(p => p.position === 3);
  const forwards = players.filter(p => p.position === 4);

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-w-2xl mx-auto">
      {/* Pitch background */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {/* Gradient grass effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-emerald-500 to-emerald-600" />

        {/* Pitch lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {/* Border */}
          <rect x="5%" y="3%" width="90%" height="94%" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

          {/* Center line */}
          <line x1="5%" y1="50%" x2="95%" y2="50%" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Center circle */}
          <circle cx="50%" cy="50%" r="10%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Top penalty area */}
          <rect x="25%" y="3%" width="50%" height="18%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Top goal area */}
          <rect x="35%" y="3%" width="30%" height="8%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Bottom penalty area */}
          <rect x="25%" y="79%" width="50%" height="18%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Bottom goal area */}
          <rect x="35%" y="89%" width="30%" height="8%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        </svg>

        {/* Grass pattern overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 40px)'
          }}
        />
      </div>

      {/* Players positioned on pitch */}
      <div className="absolute inset-0 flex flex-col justify-around py-4 sm:py-6">
        {/* Forwards row */}
        <div className="flex justify-center gap-2 sm:gap-4 px-2">
          {forwards.map((player, i) => (
            <PlayerCard
              key={player.name}
              player={player}
              teamMeta={teamsMeta[player.team_id]}
              delay={0.1 + i * 0.05}
            />
          ))}
        </div>

        {/* Midfielders row */}
        <div className="flex justify-center gap-2 sm:gap-4 px-2">
          {midfielders.map((player, i) => (
            <PlayerCard
              key={player.name}
              player={player}
              teamMeta={teamsMeta[player.team_id]}
              delay={0.2 + i * 0.05}
            />
          ))}
        </div>

        {/* Defenders row */}
        <div className="flex justify-center gap-2 sm:gap-4 px-2">
          {defenders.map((player, i) => (
            <PlayerCard
              key={player.name}
              player={player}
              teamMeta={teamsMeta[player.team_id]}
              delay={0.3 + i * 0.05}
            />
          ))}
        </div>

        {/* Goalkeeper row */}
        <div className="flex justify-center gap-4 px-2">
          {goalkeepers.map((player, i) => (
            <PlayerCard
              key={player.name}
              player={player}
              teamMeta={teamsMeta[player.team_id]}
              delay={0.4 + i * 0.05}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Substitutes bench
function Bench({
  players,
  teamsMeta
}: {
  players: Player[];
  teamsMeta: Record<string, TeamMeta>;
}) {
  return (
    <div className="mt-4">
      <div className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
        Substitutes
      </div>
      <div className="flex justify-center gap-3 sm:gap-6 p-3 bg-gray-100 dark:bg-dark-700/50 rounded-xl">
        {players.map((player, i) => (
          <div key={player.name} className="text-center">
            <div className="text-[9px] text-gray-500 dark:text-gray-400 mb-1">
              {player.position === 1 ? 'GKP' : player.position === 2 ? 'DEF' : player.position === 3 ? 'MID' : 'FWD'}
            </div>
            <PlayerCard
              player={player}
              teamMeta={teamsMeta[player.team_id]}
              delay={0.5 + i * 0.05}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Main team display component with manager selector
export function TeamDisplay({ squads, teamsMeta, managers }: TeamDisplayProps) {
  const [selectedManager, setSelectedManager] = useState(managers[0] || '');

  const currentSquad = squads[selectedManager];

  if (!currentSquad) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Manager selector tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {managers.map((manager) => {
          const managerSquad = squads[manager];
          const gwPoints = managerSquad?.gw_points;
          return (
            <motion.button
              key={manager}
              onClick={() => setSelectedManager(manager)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedManager === manager
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-500'
                }`}
            >
              {manager}{gwPoints !== undefined && gwPoints > 0 ? ` (${gwPoints})` : ''}
            </motion.button>
          );
        })}
      </div>

      {/* Team name and GW points */}
      <motion.div
        key={selectedManager}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <h3 className="text-lg font-bold gradient-text">{selectedManager}&apos;s Team</h3>
        {currentSquad.gw_points !== undefined && currentSquad.gw_points > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-full text-sm font-bold shadow-lg">
            <span>GW Points:</span>
            <span className="text-lg">{currentSquad.gw_points}</span>
          </div>
        )}
      </motion.div>

      {/* Pitch with starting 11 */}
      <motion.div
        key={`pitch-${selectedManager}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Pitch players={currentSquad.starting} teamsMeta={teamsMeta} />
      </motion.div>

      {/* Bench */}
      <motion.div
        key={`bench-${selectedManager}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Bench players={currentSquad.bench} teamsMeta={teamsMeta} />
      </motion.div>
    </div>
  );
}
