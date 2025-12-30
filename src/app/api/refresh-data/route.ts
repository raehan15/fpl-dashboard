import { NextResponse } from 'next/server';

// League ID - same as in Python script
const LEAGUE_ID = 885316;

// Team colors for jersey representation
const TEAM_COLORS: Record<number, { primary: string; secondary: string }> = {
    1: { primary: "#EF0107", secondary: "#FFFFFF" },  // Arsenal
    2: { primary: "#95BFE5", secondary: "#670E36" },  // Aston Villa
    3: { primary: "#DA291C", secondary: "#000000" },  // Bournemouth
    4: { primary: "#E30613", secondary: "#FBB800" },  // Brentford
    5: { primary: "#0057B8", secondary: "#FFFFFF" },  // Brighton
    6: { primary: "#034694", secondary: "#FFFFFF" },  // Chelsea
    7: { primary: "#1B458F", secondary: "#C4122E" },  // Crystal Palace
    8: { primary: "#003399", secondary: "#FFFFFF" },  // Everton
    9: { primary: "#FFFFFF", secondary: "#000000" },  // Fulham
    10: { primary: "#0044FF", secondary: "#FFFFFF" }, // Ipswich
    11: { primary: "#003090", secondary: "#FDBE11" }, // Leicester
    12: { primary: "#C8102E", secondary: "#FFFFFF" }, // Liverpool
    13: { primary: "#6CABDD", secondary: "#FFFFFF" }, // Man City
    14: { primary: "#DA291C", secondary: "#FBE122" }, // Man Utd
    15: { primary: "#241F20", secondary: "#FFFFFF" }, // Newcastle
    16: { primary: "#DD0000", secondary: "#FFFFFF" }, // Nott'm Forest
    17: { primary: "#D71920", secondary: "#FFFFFF" }, // Southampton
    18: { primary: "#FFFFFF", secondary: "#132257" }, // Spurs
    19: { primary: "#7A263A", secondary: "#1BB1E7" }, // West Ham
    20: { primary: "#FDB913", secondary: "#231F20" }, // Wolves
};

interface TeamMeta {
    name: string;
    short: string;
    primary: string;
    secondary: string;
}

interface PlayerData {
    name: string;
    full_name: string;
    position: number;
    team_id: number;
}

interface FixtureData {
    opponent: string;
    opponent_id: number;
    is_home: boolean;
}

interface SquadPlayer {
    name: string;
    full_name: string;
    position: number;
    team_id: number;
    team_short: string;
    is_captain: boolean;
    is_vice: boolean;
    multiplier: number;
    fixture: FixtureData;
    points: number;
    raw_points: number;
}

export async function GET() {
    try {
        console.log("Fetching FPL data...");

        // Fetch bootstrap data (all players + gameweek info)
        const bootstrapRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
            next: { revalidate: 0 } // Don't cache
        });

        if (!bootstrapRes.ok) {
            throw new Error(`Failed to fetch bootstrap data: ${bootstrapRes.status}`);
        }

        const bootstrap = await bootstrapRes.json();
        const players = bootstrap.elements;
        const events = bootstrap.events;
        const teamsApi = bootstrap.teams;

        // Detect current gameweek
        let currentGwObj = events.find((event: any) => event.is_current);
        if (!currentGwObj) {
            currentGwObj = events.find((event: any) => event.is_next);
        }
        const currentGw = currentGwObj?.id || 38;
        console.log(`Current Gameweek: ${currentGw}`);

        // Build teams metadata
        const teamsMeta: Record<number, TeamMeta> = {};
        for (const team of teamsApi) {
            const colorData = TEAM_COLORS[team.id] || { primary: "#888888", secondary: "#FFFFFF" };
            teamsMeta[team.id] = {
                name: team.name,
                short: team.short_name,
                primary: colorData.primary,
                secondary: colorData.secondary
            };
        }

        // Map player ID -> player data
        const playerMap: Record<number, PlayerData> = {};
        for (const p of players) {
            playerMap[p.id] = {
                name: p.web_name,
                full_name: `${p.first_name} ${p.second_name}`,
                position: p.element_type,
                team_id: p.team
            };
        }

        // Fetch fixtures
        const fixturesRes = await fetch("https://fantasy.premierleague.com/api/fixtures/", {
            next: { revalidate: 0 }
        });
        const fixtures = fixturesRes.ok ? await fixturesRes.json() : [];

        // Get upcoming fixtures for current GW
        const upcomingFixtures: Record<number, FixtureData> = {};
        for (const fixture of fixtures) {
            if (fixture.event === currentGw) {
                const teamH = fixture.team_h;
                const teamA = fixture.team_a;

                upcomingFixtures[teamH] = {
                    opponent: teamsMeta[teamA]?.short || "???",
                    opponent_id: teamA,
                    is_home: true
                };
                upcomingFixtures[teamA] = {
                    opponent: teamsMeta[teamH]?.short || "???",
                    opponent_id: teamH,
                    is_home: false
                };
            }
        }

        // Fetch live GW points
        let livePoints: Record<number, number> = {};
        try {
            const liveRes = await fetch(
                `https://fantasy.premierleague.com/api/event/${currentGw}/live/`,
                { next: { revalidate: 0 } }
            );
            if (liveRes.ok) {
                const liveData = await liveRes.json();
                for (const element of liveData.elements || []) {
                    livePoints[element.id] = element.stats?.total_points || 0;
                }
                console.log(`Got live points for ${Object.keys(livePoints).length} players`);
            }
        } catch (e) {
            console.log('Could not fetch live points, continuing without...');
        }

        // Get league standings
        const leagueRes = await fetch(`https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`, {
            next: { revalidate: 0 }
        });

        if (!leagueRes.ok) {
            throw new Error(`Failed to fetch league data: ${leagueRes.status}`);
        }

        const league = await leagueRes.json();
        const managers = league.standings.results;

        const teams: Record<string, any> = {};
        const playerOwners: Record<string, string[]> = {};
        const chipsPlayed: Record<string, string | null> = {};
        const squads: Record<string, { starting: SquadPlayer[]; bench: SquadPlayer[]; gw_points: number }> = {};

        // Fetch squads, transfers, and chips for each manager
        for (const manager of managers) {
            const entryId = manager.entry;
            const managerName = manager.player_name;
            console.log(`Processing manager: ${managerName}`);

            // Fetch picks
            const picksRes = await fetch(
                `https://fantasy.premierleague.com/api/entry/${entryId}/event/${currentGw}/picks/`,
                { next: { revalidate: 0 } }
            );

            if (!picksRes.ok) {
                console.log(`Could not fetch picks for ${managerName}`);
                continue;
            }

            const picksData = await picksRes.json();
            if (!picksData.picks) continue;

            const picks = picksData.picks;

            // Get GW points from entry_history
            const entryHistory = picksData.entry_history || {};
            const gwPointsFromApi = entryHistory.points || 0;

            // Build squad data
            const startingSquad: SquadPlayer[] = [];
            const benchSquad: SquadPlayer[] = [];
            const startingNames: string[] = [];
            let calculatedGwPoints = 0;

            for (const pick of picks) {
                const playerId = pick.element;
                const playerInfo = playerMap[playerId] || {};
                const teamId = playerInfo.team_id || 0;
                const teamData = teamsMeta[teamId] || {};
                const fixtureData = upcomingFixtures[teamId] || { opponent: "???", opponent_id: 0, is_home: true };

                // Get player's raw points and apply multiplier
                const rawPoints = livePoints[playerId] || 0;
                const playerMultiplier = pick.multiplier;
                const playerPoints = playerMultiplier > 0 ? rawPoints * playerMultiplier : rawPoints;

                const squadPlayer: SquadPlayer = {
                    name: playerInfo.name || "Unknown",
                    full_name: playerInfo.full_name || "Unknown",
                    position: playerInfo.position || 0,
                    team_id: teamId,
                    team_short: teamData.short || "???",
                    is_captain: pick.is_captain,
                    is_vice: pick.is_vice_captain,
                    multiplier: pick.multiplier,
                    fixture: fixtureData,
                    points: playerPoints,
                    raw_points: rawPoints
                };

                if (pick.multiplier > 0) {
                    startingSquad.push(squadPlayer);
                    startingNames.push(playerInfo.full_name || "Unknown");
                    calculatedGwPoints += playerPoints;
                } else {
                    benchSquad.push(squadPlayer);
                }
            }

            // Sort by position
            startingSquad.sort((a, b) => {
                if (a.position !== b.position) return a.position - b.position;
                if (a.is_captain !== b.is_captain) return b.is_captain ? 1 : -1;
                return b.is_vice ? 1 : -1;
            });

            squads[managerName] = {
                starting: startingSquad,
                bench: benchSquad,
                gw_points: gwPointsFromApi > 0 ? gwPointsFromApi : calculatedGwPoints
            };

            // Get captain
            const captainEntry = picks.find((p: any) => p.is_captain);
            const captain = captainEntry ? playerMap[captainEntry.element]?.full_name || "Unknown" : "Unknown";

            // Track chip
            const activeChip = picksData.active_chip;
            chipsPlayed[managerName] = activeChip || null;

            // Fetch transfers
            const transfersRes = await fetch(
                `https://fantasy.premierleague.com/api/entry/${entryId}/transfers/`,
                { next: { revalidate: 0 } }
            );
            const transfersData = transfersRes.ok ? await transfersRes.json() : [];

            const gwTransfers = transfersData.filter((t: any) => t.event === currentGw);
            const transferList = gwTransfers.map((t: any) => ({
                in: playerMap[t.element_in]?.full_name || "Unknown",
                out: playerMap[t.element_out]?.full_name || "Unknown"
            }));

            teams[managerName] = {
                rank: manager.rank,
                total_points: manager.total,
                starting_squad: startingNames,
                captain,
                transfers: transferList
            };

            // Track ownership
            for (const playerName of startingNames) {
                if (!playerOwners[playerName]) {
                    playerOwners[playerName] = [];
                }
                playerOwners[playerName].push(managerName);
            }
        }

        // Calculate differentials
        const differentialsUnique: Record<string, string[]> = {};
        const differentialsDuo: Record<string, string[]> = {};

        for (const [player, owners] of Object.entries(playerOwners)) {
            if (owners.length === 1) {
                const owner = owners[0];
                if (!differentialsUnique[owner]) differentialsUnique[owner] = [];
                differentialsUnique[owner].push(player);
            } else if (owners.length === 2) {
                for (const owner of owners) {
                    if (!differentialsDuo[owner]) differentialsDuo[owner] = [];
                    differentialsDuo[owner].push(player);
                }
            }
        }

        // Format timestamp in PKT (UTC+5)
        const now = new Date();
        const pktOffset = 5 * 60; // 5 hours in minutes
        const pktTime = new Date(now.getTime() + (pktOffset + now.getTimezoneOffset()) * 60000);
        const lastUpdated = `${pktTime.getFullYear()}-${String(pktTime.getMonth() + 1).padStart(2, '0')}-${String(pktTime.getDate()).padStart(2, '0')} ${String(pktTime.getHours()).padStart(2, '0')}:${String(pktTime.getMinutes()).padStart(2, '0')}:${String(pktTime.getSeconds()).padStart(2, '0')} PKT`;

        // Construct output
        const outputData = {
            meta: {
                gameweek: currentGw,
                league_name: league.league.name,
                last_updated: lastUpdated
            },
            teams_meta: teamsMeta,
            standings: managers.map((m: any) => ({
                rank: m.rank,
                manager: m.player_name,
                team_name: m.entry_name,
                total_points: m.total
            })),
            squads,
            chips: chipsPlayed,
            captains: Object.fromEntries(
                Object.entries(teams).map(([m, data]) => [m, data.captain])
            ),
            transfers: Object.fromEntries(
                Object.entries(teams).map(([m, data]) => [m, data.transfers])
            ),
            differentials: {
                unique: differentialsUnique,
                duo: differentialsDuo
            }
        };

        console.log("Data successfully fetched!");

        return NextResponse.json(outputData);

    } catch (error) {
        console.error("Error fetching FPL data:", error);
        return NextResponse.json(
            { error: "Failed to fetch FPL data", details: String(error) },
            { status: 500 }
        );
    }
}
