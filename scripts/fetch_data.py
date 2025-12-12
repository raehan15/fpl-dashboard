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


def fetch_data():
    print("Fetching FPL data...")
    
    # Get all players + current gameweek info
    try:
        bootstrap = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/").json()
        players = bootstrap["elements"]
        events = bootstrap["events"]
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
    current_gw_obj = next((event for event in events if event["is_current"]), None)
    if not current_gw_obj:
        # If no current GW (e.g. season over or pre-season), try next
        current_gw_obj = next((event for event in events if event["is_next"]), None)
    
    current_gw = current_gw_obj["id"] if current_gw_obj else 38
    print(f"Current Gameweek: {current_gw}")

    # Map player ID -> Name
    player_map = {p["id"]: f"{p['first_name']} {p['second_name']}" for p in players}

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
        starting_squad = [player_map[p["element"]] for p in picks if p["multiplier"] > 0]  # only starting 11
        
        captain_entry = next((p for p in picks if p["is_captain"]), None)
        captain = player_map[captain_entry["element"]] if captain_entry else "Unknown"

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
                player_in = player_map.get(t["element_in"], "Unknown")
                player_out = player_map.get(t["element_out"], "Unknown")
                transfer_list.append({"in": player_in, "out": player_out})

        teams[manager_name] = {
            "rank": manager["rank"],
            "total_points": manager["total"],
            "starting_squad": starting_squad,
            "captain": captain,
            "transfers": transfer_list
        }

        # Track ownership (only starting 11)
        for player in starting_squad:
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
        "standings": [
            {
                "rank": m["rank"],
                "manager": m["player_name"],
                "team_name": m["entry_name"],
                "total_points": m["total"]
            } for m in managers
        ],
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
