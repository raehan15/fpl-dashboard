import requests
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# ==============================
_raw_league = os.environ.get("LEAGUE_ID", "339843").strip()
if not _raw_league.isdigit():
    print(f"❌ Error: '{_raw_league}' appears to be a league invite code (alphanumeric).")
    print("   The FPL API requires the numeric League ID from your browser URL:")
    print("   https://fantasy.premierleague.com/leagues/[NUMERIC_ID]/standings/c")
    sys.exit(1)
LEAGUE_ID = int(_raw_league)
# ==============================

# Pakistan Standard Time is UTC+5
PKT = timezone(timedelta(hours=5))

# Common browser headers to prevent Cloudflare 403 blocks
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

# Team colors for jersey representation (primary, secondary)
TEAM_COLORS = {
    1: {"name": "Arsenal", "short": "ARS", "primary": "#EF0107", "secondary": "#FFFFFF"},
    2: {"name": "Aston Villa", "short": "AVL", "primary": "#95BFE5", "secondary": "#670E36"},
    3: {"name": "Bournemouth", "short": "BOU", "primary": "#DA291C", "secondary": "#000000"},
    4: {"name": "Brentford", "short": "BRE", "primary": "#E30613", "secondary": "#FBB800"},
    5: {"name": "Brighton", "short": "BHA", "primary": "#0057B8", "secondary": "#FFFFFF"},
    6: {"name": "Chelsea", "short": "CHE", "primary": "#034694", "secondary": "#FFFFFF"},
    7: {"name": "Crystal Palace", "short": "CRY", "primary": "#1B458F", "secondary": "#C4122E"},
    8: {"name": "Everton", "short": "EVE", "primary": "#003399", "secondary": "#FFFFFF"},
    9: {"name": "Fulham", "short": "FUL", "primary": "#FFFFFF", "secondary": "#000000"},
    10: {"name": "Ipswich", "short": "IPS", "primary": "#0044FF", "secondary": "#FFFFFF"},
    11: {"name": "Leicester", "short": "LEI", "primary": "#003090", "secondary": "#FDBE11"},
    12: {"name": "Liverpool", "short": "LIV", "primary": "#C8102E", "secondary": "#FFFFFF"},
    13: {"name": "Man City", "short": "MCI", "primary": "#6CABDD", "secondary": "#FFFFFF"},
    14: {"name": "Man Utd", "short": "MUN", "primary": "#DA291C", "secondary": "#FBE122"},
    15: {"name": "Newcastle", "short": "NEW", "primary": "#241F20", "secondary": "#FFFFFF"},
    16: {"name": "Nott'm Forest", "short": "NFO", "primary": "#DD0000", "secondary": "#FFFFFF"},
    17: {"name": "Southampton", "short": "SOU", "primary": "#D71920", "secondary": "#FFFFFF"},
    18: {"name": "Spurs", "short": "TOT", "primary": "#FFFFFF", "secondary": "#132257"},
    19: {"name": "West Ham", "short": "WHU", "primary": "#7A263A", "secondary": "#1BB1E7"},
    20: {"name": "Wolves", "short": "WOL", "primary": "#FDB913", "secondary": "#231F20"},
}


def get_upcoming_fixtures(fixtures, current_gw, teams_map):
    """
    Get upcoming fixtures for the current gameweek.
    Returns dict: player_team_id -> {opponent_short, is_home}
    """
    gw_fixtures = {}
    for fixture in fixtures:
        if fixture.get("event") == current_gw:
            team_h = fixture["team_h"]
            team_a = fixture["team_a"]
            
            # Home team plays against away team
            gw_fixtures[team_h] = {
                "opponent": teams_map.get(team_a, {}).get("short", "???"),
                "opponent_id": team_a,
                "is_home": True
            }
            # Away team plays against home team
            gw_fixtures[team_a] = {
                "opponent": teams_map.get(team_h, {}).get("short", "???"),
                "opponent_id": team_h,
                "is_home": False
            }
    return gw_fixtures


def fetch_data():
    """
    Fetch all FPL data with all-or-nothing write logic.
    Only writes to file if ALL critical data is successfully fetched.
    """
    print("=" * 50)
    print("FPL Data Fetch - Starting...")
    print("=" * 50)
    
    errors = []  # Track any errors
    
    # ========================================
    # STEP 1: Fetch bootstrap data (CRITICAL)
    # ========================================
    print("\n[1/4] Fetching bootstrap data...")
    try:
        bootstrap_response = requests.get(
            "https://fantasy.premierleague.com/api/bootstrap-static/",
            headers=HEADERS,
            timeout=30
        )
        bootstrap_response.raise_for_status()
        bootstrap = bootstrap_response.json()
        players = bootstrap["elements"]
        events = bootstrap["events"]
        teams_api = bootstrap["teams"]
        print(f"  ✅ Got {len(players)} players, {len(teams_api)} teams")
    except Exception as e:
        print(f"  ❌ CRITICAL ERROR: {e}")
        print("\n⛔ Aborting: Cannot proceed without bootstrap data")
        sys.exit(1)

    # Detect current GW
    current_gw_obj = next((event for event in events if event["is_current"]), None)
    if not current_gw_obj:
        current_gw_obj = next((event for event in events if event["is_next"]), None)
    
    current_gw = current_gw_obj["id"] if current_gw_obj else 38
    print(f"  📅 Current Gameweek: {current_gw}")

    # Build teams metadata
    teams_meta = {}
    for team in teams_api:
        team_id = team["id"]
        color_data = TEAM_COLORS.get(team_id, {"primary": "#888888", "secondary": "#FFFFFF"})
        teams_meta[team_id] = {
            "name": team["name"],
            "short": team["short_name"],
            "primary": color_data["primary"],
            "secondary": color_data["secondary"]
        }

    # Map player ID -> player data
    player_map = {}
    for p in players:
        player_map[p["id"]] = {
            "name": p["web_name"],
            "full_name": f"{p['first_name']} {p['second_name']}",
            "position": p["element_type"],
            "team_id": p["team"]
        }

    # ========================================
    # STEP 2: Fetch fixtures (NON-CRITICAL)
    # ========================================
    print("\n[2/4] Fetching fixtures...")
    try:
        fixtures_response = requests.get(
            "https://fantasy.premierleague.com/api/fixtures/",
            headers=HEADERS,
            timeout=30
        )
        fixtures_response.raise_for_status()
        fixtures = fixtures_response.json()
        print(f"  ✅ Got {len(fixtures)} fixtures")
    except Exception as e:
        print(f"  ⚠️ Warning: {e}")
        print("  ℹ️ Continuing with empty fixtures...")
        fixtures = []
        errors.append(f"Fixtures: {e}")

    upcoming_fixtures = get_upcoming_fixtures(fixtures, current_gw, teams_meta)

    # ========================================
    # STEP 2.5: Fetch live GW points (NON-CRITICAL)
    # ========================================
    print("\n[2.5/5] Fetching live gameweek points...")
    live_points = {}  # player_id -> points
    try:
        live_response = requests.get(
            f"https://fantasy.premierleague.com/api/event/{current_gw}/live/",
            headers=HEADERS,
            timeout=30
        )
        live_response.raise_for_status()
        live_data = live_response.json()
        for element in live_data.get("elements", []):
            player_id = element.get("id")
            stats = element.get("stats", {})
            points = stats.get("total_points", 0)
            live_points[player_id] = points
        print(f"  ✅ Got live points for {len(live_points)} players")
    except Exception as e:
        print(f"  ⚠️ Warning: {e}")
        print("  ℹ️ Continuing without live points...")
        errors.append(f"Live points: {e}")

    # ========================================
    # STEP 3: Fetch league standings (CRITICAL)
    # ========================================
    print("\n[3/4] Fetching league standings...")
    league_url = f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/"
    try:
        league_response = requests.get(league_url, headers=HEADERS, timeout=30)
        league_response.raise_for_status()
        league = league_response.json()
        managers = league["standings"]["results"]
        print(f"  ✅ Got {len(managers)} managers")
    except Exception as e:
        print(f"  ❌ CRITICAL ERROR: {e}")
        print("\n⛔ Aborting: Cannot proceed without league data")
        sys.exit(1)

    # ========================================
    # STEP 4: Fetch manager data (ALL OR NOTHING)
    # ========================================
    print("\n[4/4] Fetching manager squads and transfers...")
    
    teams = {}
    player_owners = defaultdict(list)
    chips_played = {}
    squads = {}
    managers_processed = 0
    managers_failed = 0

    for manager in managers:
        entry_id = manager["entry"]
        manager_name = manager["player_name"]

        # Fetch picks
        picks_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{current_gw}/picks/"
        try:
            picks_response = requests.get(picks_url, headers=HEADERS, timeout=30)
            picks_response.raise_for_status()
            picks_data = picks_response.json()
        except Exception as e:
            print(f"  ⚠️ {manager_name}: Failed to fetch picks - {e}")
            managers_failed += 1
            errors.append(f"{manager_name} picks: {e}")
            continue

        if "picks" not in picks_data:
            print(f"  ⚠️ {manager_name}: No picks data available")
            managers_failed += 1
            continue

        picks = picks_data["picks"]
        
        # Get GW points from entry_history
        entry_history = picks_data.get("entry_history", {})
        gw_points = entry_history.get("points", 0)
        
        # Build squad data
        starting_squad = []
        bench_squad = []
        starting_names = []
        calculated_gw_points = 0

        for pick in picks:
            player_id = pick["element"]
            player_info = player_map.get(player_id, {})
            team_id = player_info.get("team_id", 0)
            team_data = teams_meta.get(team_id, {})
            fixture_data = upcoming_fixtures.get(team_id, {"opponent": "???", "opponent_id": 0, "is_home": True})
            
            # Get player's raw points and apply multiplier
            raw_points = live_points.get(player_id, 0)
            multiplier = pick["multiplier"]
            player_points = raw_points * multiplier if multiplier > 0 else raw_points

            player_data = {
                "name": player_info.get("name", "Unknown"),
                "full_name": player_info.get("full_name", "Unknown"),
                "position": player_info.get("position", 0),
                "team_id": team_id,
                "team_short": team_data.get("short", "???"),
                "is_captain": pick["is_captain"],
                "is_vice": pick["is_vice_captain"],
                "multiplier": pick["multiplier"],
                "fixture": fixture_data,
                "points": player_points,
                "raw_points": raw_points
            }

            if pick["multiplier"] > 0:
                starting_squad.append(player_data)
                starting_names.append(player_info.get("full_name", "Unknown"))
                calculated_gw_points += player_points
            else:
                bench_squad.append(player_data)

        # Sort by position
        starting_squad.sort(key=lambda x: (x["position"], -x["is_captain"], -x["is_vice"]))

        squads[manager_name] = {
            "starting": starting_squad,
            "bench": bench_squad,
            "gw_points": gw_points if gw_points > 0 else calculated_gw_points
        }

        captain_entry = next((p for p in picks if p["is_captain"]), None)
        captain = player_map.get(captain_entry["element"], {}).get("full_name", "Unknown") if captain_entry else "Unknown"

        # Track chip
        active_chip = picks_data.get("active_chip")
        chips_played[manager_name] = active_chip if active_chip else None

        # Fetch transfers
        transfers_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/transfers/"
        try:
            transfers_response = requests.get(transfers_url, headers=HEADERS, timeout=30)
            transfers_response.raise_for_status()
            transfers_data = transfers_response.json()
        except Exception as e:
            transfers_data = []
            errors.append(f"{manager_name} transfers: {e}")

        gw_transfers = [t for t in transfers_data if t["event"] == current_gw]
        
        transfer_list = []
        for t in gw_transfers:
            player_in = player_map.get(t["element_in"], {}).get("full_name", "Unknown")
            player_out = player_map.get(t["element_out"], {}).get("full_name", "Unknown")
            transfer_list.append({"in": player_in, "out": player_out})

        teams[manager_name] = {
            "rank": manager["rank"],
            "total_points": manager["total"],
            "starting_squad": starting_names,
            "captain": captain,
            "transfers": transfer_list
        }

        # Track ownership
        for player in starting_names:
            player_owners[player].append(manager_name)
        
        managers_processed += 1

    print(f"  ✅ Processed: {managers_processed}/{len(managers)} managers")
    if managers_failed > 0:
        print(f"  ⚠️ Failed: {managers_failed} managers")

    # ========================================
    # ALL-OR-NOTHING CHECK
    # ========================================
    print("\n" + "=" * 50)
    
    # Require at least 50% of managers to be processed
    min_managers_required = len(managers) // 2
    if managers_processed < min_managers_required:
        print(f"❌ ABORTING: Only {managers_processed}/{len(managers)} managers processed")
        print(f"   Minimum required: {min_managers_required}")
        print("\n⛔ Data NOT written to prevent corruption")
        sys.exit(1)

    # Calculate differentials
    differentials_one = defaultdict(list)
    for player, owners in player_owners.items():
        if len(owners) == 1:
            differentials_one[owners[0]].append(player)

    differentials_two = defaultdict(list)
    for player, owners in player_owners.items():
        if len(owners) == 2:
            for owner in owners:
                differentials_two[owner].append(player)

    # Construct final data object
    now_pkt = datetime.now(PKT)
    
    output_data = {
        "meta": {
            "gameweek": current_gw,
            "league_id": LEAGUE_ID,
            "league_name": league["league"]["name"],
            "last_updated": now_pkt.strftime("%Y-%m-%d %H:%M:%S") + " PKT"
        },
        "teams_meta": teams_meta,
        "standings": [
            {
                "rank": m["rank"],
                "manager": m["player_name"],
                "team_name": m["entry_name"],
                "total_points": m["total"]
            } for m in managers
        ],
        "squads": squads,
        "chips": chips_played,
        "captains": {m: data["captain"] for m, data in teams.items()},
        "transfers": {m: data["transfers"] for m, data in teams.items()},
        "differentials": {
            "unique": dict(differentials_one),
            "duo": dict(differentials_two)
        }
    }

    # ========================================
    # WRITE DATA
    # ========================================
    os.makedirs("src/data", exist_ok=True)
    
    with open("src/data/fpl_data.json", "w") as f:
        json.dump(output_data, f, indent=2)
    
    print("✅ SUCCESS: Data written to src/data/fpl_data.json")
    print(f"   Last updated: {output_data['meta']['last_updated']}")
    
    if errors:
        print(f"\n⚠️ Non-critical errors encountered: {len(errors)}")
        for err in errors[:5]:  # Show first 5 errors
            print(f"   - {err}")
    
    print("=" * 50)


if __name__ == "__main__":
    fetch_data()
