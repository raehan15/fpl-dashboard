import requests
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# ==============================
LEAGUE_ID = 885316  # your league ID
# ==============================

# Pakistan Standard Time is UTC+5
PKT = timezone(timedelta(hours=5))

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

def should_update(events):
    """
    Check if we should update based on deadline timing.
    Returns (should_update: bool, reason: str)
    
    Rules:
    - If manually triggered: Always update
    - If within 50-65 minutes after ANY deadline: Update
    - Otherwise: Skip
    """
    is_manual = os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
    
    if is_manual:
        return True, "Manual trigger"
    
    now = datetime.now(timezone.utc)
    
    for event in events:
        deadline_str = event.get('deadline_time')
        if not deadline_str:
            continue
        
        try:
            # Parse FPL deadline (format: "2024-12-14T11:00:00Z")
            deadline = datetime.strptime(deadline_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            
            # Calculate minutes since deadline
            diff = now - deadline
            minutes_since = diff.total_seconds() / 60
            
            # Check if we're in the 50-65 minute window after deadline
            if 50 <= minutes_since <= 65:
                return True, f"~50 mins after GW{event['id']} deadline"
                
        except ValueError:
            continue
    
    return False, "Not within post-deadline window"


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
    print("Fetching FPL data...")
    
    # Get all players + current gameweek info
    try:
        bootstrap = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/").json()
        players = bootstrap["elements"]
        events = bootstrap["events"]
        teams_api = bootstrap["teams"]
    except Exception as e:
        print(f"Error fetching bootstrap data: {e}")
        return

    # Check if we should update
    update, reason = should_update(events)
    if not update:
        print(f"⏳ Skipping update: {reason}")
        return
    
    print(f"✅ Proceeding with update: {reason}")

    # Detect current GW
    current_gw_obj = next((event for event in events if event["is_current"]), None)
    if not current_gw_obj:
        # If no current GW (e.g. season over or pre-season), try next
        current_gw_obj = next((event for event in events if event["is_next"]), None)
    
    current_gw = current_gw_obj["id"] if current_gw_obj else 38
    print(f"Current Gameweek: {current_gw}")

    # Build teams metadata (merge API data with our color definitions)
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

    # Map player ID -> full player data
    player_map = {}
    for p in players:
        player_map[p["id"]] = {
            "name": p["web_name"],  # Short display name
            "full_name": f"{p['first_name']} {p['second_name']}",
            "position": p["element_type"],  # 1=GK, 2=DEF, 3=MID, 4=FWD
            "team_id": p["team"]
        }

    # Fetch fixtures for upcoming matches
    try:
        fixtures = requests.get("https://fantasy.premierleague.com/api/fixtures/").json()
    except Exception as e:
        print(f"Error fetching fixtures: {e}")
        fixtures = []

    # Get upcoming fixtures for current GW
    upcoming_fixtures = get_upcoming_fixtures(fixtures, current_gw, teams_meta)

    # Get league standings
    league_url = f"https://fantasy.premierleague.com/api/leagues-classic/{LEAGUE_ID}/standings/"
    try:
        league = requests.get(league_url).json()
        managers = league["standings"]["results"]
    except Exception as e:
        print(f"Error fetching league data: {e}")
        return

    teams = {}
    player_owners = defaultdict(list)
    chips_played = {}
    squads = {}

    # Fetch squads + transfers + chips
    for manager in managers:
        entry_id = manager["entry"]
        manager_name = manager["player_name"]
        print(f"Processing manager: {manager_name}")

        # Picks (squad + captain)
        picks_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{current_gw}/picks/"
        try:
            picks_data = requests.get(picks_url).json()
        except:
            print(f"Could not fetch picks for {manager_name}")
            continue

        if "picks" not in picks_data:
            continue

        picks = picks_data["picks"]
        
        # Build full squad data
        starting_squad = []
        bench_squad = []
        starting_names = []  # For differentials tracking
        
        for pick in picks:
            player_id = pick["element"]
            player_info = player_map.get(player_id, {})
            team_id = player_info.get("team_id", 0)
            team_data = teams_meta.get(team_id, {})
            fixture_data = upcoming_fixtures.get(team_id, {"opponent": "???", "is_home": True})
            
            player_data = {
                "name": player_info.get("name", "Unknown"),
                "full_name": player_info.get("full_name", "Unknown"),
                "position": player_info.get("position", 0),
                "team_id": team_id,
                "team_short": team_data.get("short", "???"),
                "is_captain": pick["is_captain"],
                "is_vice": pick["is_vice_captain"],
                "multiplier": pick["multiplier"],
                "fixture": fixture_data
            }
            
            if pick["multiplier"] > 0:
                starting_squad.append(player_data)
                starting_names.append(player_info.get("full_name", "Unknown"))
            else:
                bench_squad.append(player_data)
        
        # Sort by position for proper pitch display
        starting_squad.sort(key=lambda x: (x["position"], -x["is_captain"], -x["is_vice"]))
        
        squads[manager_name] = {
            "starting": starting_squad,
            "bench": bench_squad
        }

        captain_entry = next((p for p in picks if p["is_captain"]), None)
        captain = player_map[captain_entry["element"]]["full_name"] if captain_entry else "Unknown"

        # Track chip
        active_chip = picks_data.get("active_chip")
        chips_played[manager_name] = active_chip if active_chip else None

        # Transfers this GW
        transfers_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/transfers/"
        try:
            transfers_data = requests.get(transfers_url).json()
        except:
            transfers_data = []

        gw_transfers = [t for t in transfers_data if t["event"] == current_gw]
        
        transfer_list = []
        if gw_transfers:
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

        # Track ownership (only starting 11)
        for player in starting_names:
            player_owners[player].append(manager_name)

    # Differentials (owned by only 1 manager)
    differentials_one = defaultdict(list)
    for player, owners in player_owners.items():
        if len(owners) == 1:
            differentials_one[owners[0]].append(player)

    # Differentials (owned by exactly 2 managers)
    differentials_two = defaultdict(list)
    for player, owners in player_owners.items():
        if len(owners) == 2:
            for owner in owners:
                differentials_two[owner].append(player)

    # Construct final data object
    # Convert current time to Pakistan Standard Time (UTC+5)
    now_pkt = datetime.now(PKT)
    
    output_data = {
        "meta": {
            "gameweek": current_gw,
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

    # Ensure directory exists
    os.makedirs("src/data", exist_ok=True)
    
    # Write to file
    with open("src/data/fpl_data.json", "w") as f:
        json.dump(output_data, f, indent=2)
    
    print("Data successfully saved to src/data/fpl_data.json")

if __name__ == "__main__":
    fetch_data()

