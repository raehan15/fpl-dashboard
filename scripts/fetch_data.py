import requests
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta

# ==============================
LEAGUE_ID = 885316  # your league ID
# ==============================

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

    # ---------------------------------------------------------
    # SMART SCHEDULE CHECK
    # ---------------------------------------------------------
    # We run the GitHub Action every 30 minutes.
    # But we only want to SAVE/UPDATE data if:
    # 1. It is a 6-hour mark (00:00, 06:00, 12:00, 18:00 UTC)
    # 2. OR, it is approx 1 hour after a Gameweek deadline.
    # 3. OR, it was manually triggered.
    
    is_manual_run = os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
    
    if not is_manual_run:
        now = datetime.utcnow()
        should_update = False
        reason = ""

        # Check 1: 6-hour schedule
        # We allow a small window (0-35 mins) to catch the :00 or :30 run
        if now.hour % 6 == 0 and now.minute < 35:
            should_update = True
            reason = "Standard 6-hour update"

        # Check 2: 1 hour after deadline
        if not should_update:
            # Find the current or next deadline
            # We look at all deadlines
            for event in events:
                deadline_str = event.get('deadline_time')
                if not deadline_str: continue
                
                # Parse FPL date: "2023-12-09T11:00:00Z"
                try:
                    deadline = datetime.strptime(deadline_str, "%Y-%m-%dT%H:%M:%SZ")
                    
                    # Calculate time difference
                    diff = now - deadline
                    minutes_since = diff.total_seconds() / 60
                    
                    # If we are between 60 and 95 minutes after a deadline
                    if 60 <= minutes_since <= 95:
                        should_update = True
                        reason = f"1 hour after GW{event['id']} deadline"
                        break
                except ValueError:
                    continue

        if should_update:
            print(f"✅ Update proceeding: {reason}")
        else:
            print("⏳ Skipping update: Not a 6-hour mark and no recent deadline.")
            return # EXIT SCRIPT HERE
    else:
        print("✅ Manual trigger detected. Proceeding...")

    # ---------------------------------------------------------

    # Detect current GW
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
    output_data = {
        "meta": {
            "gameweek": current_gw,
            "league_name": league["league"]["name"],
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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
