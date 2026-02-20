import numpy as np

# TRACK PROFILES (Base Lap Time, Tire Wear Factor)
TRACKS = {
    'Bahrain': {'base': 92.0, 'deg_mult': 1.5}, # High Wear
    'Monaco':  {'base': 74.0, 'deg_mult': 0.5}, # Low Wear (Street)
    'Monza':   {'base': 81.0, 'deg_mult': 1.0}, # Avg Wear
}

# TIRE PROFILES (Pace Bonus, Wear Penalty)
TIRES = {
    'SOFT': {'pace': -0.8, 'deg': 0.15},  # Fast but dies fast
    'MED':  {'pace': 0.0,  'deg': 0.10},  # Balanced
    'HARD': {'pace': +0.8, 'deg': 0.05}   # Slow but durable
}

class RaceSimulation:
    def __init__(self, d1_stats, d2_stats=None, track='Bahrain', total_laps=57):
        self.d1 = d1_stats
        self.d2 = d2_stats
        self.total_laps = total_laps
        self.track_profile = TRACKS.get(track, TRACKS['Bahrain'])

    def run_head_to_head_history(self, d1_pit, d2_pit, d1_tire, d2_tire):
        """Simulates race and returns lap-by-lap gap history"""
        t1, t2 = 0, 0 
        age1, age2 = 0, 0
        
        # Get Tire Physics
        tire1 = TIRES.get(d1_tire, TIRES['MED'])
        tire2 = TIRES.get(d2_tire, TIRES['MED'])
        
        history = [] # Stores the gap at every lap
        
        for lap in range(1, self.total_laps + 1):
            # --- DRIVER 1 ---
            # Math: BasePace + TrackBase + (TireWear * TrackMult) + TireBonus
            deg1 = (age1 * tire1['deg'] * self.track_profile['deg_mult'])
            p1 = self.d1['base_pace'] + tire1['pace'] + deg1
            t1 += np.random.normal(p1, self.d1['consistency'])
            
            if lap == d1_pit:
                t1 += 24 # Pit loss
                age1 = 0
                # AFTER PIT: Assume they switch to Mediums for simplicity
                tire1 = TIRES['MED'] 
            else:
                age1 += 1

            # --- DRIVER 2 ---
            deg2 = (age2 * tire2['deg'] * self.track_profile['deg_mult'])
            p2 = self.d2['base_pace'] + tire2['pace'] + deg2
            t2 += np.random.normal(p2, self.d2['consistency'])
            
            if lap == d2_pit:
                t2 += 24
                age2 = 0
                tire2 = TIRES['MED']
            else:
                age2 += 1
            
            # Record the GAP (Negative means D1 is ahead, Positive means D2 is ahead)
            gap = t2 - t1
            history.append({"lap": lap, "gap": round(gap, 2)})
                
        # Returns winner AND the history graph
        return (t1 < t2), history

    def run_monte_carlo_duel(self, n_simulations=500, d1_pit=20, d2_pit=20, d1_tire='MED', d2_tire='MED'):
        d1_wins = 0
        # We only need one history trace for the graph (from the last sim)
        last_history = []
        
        for _ in range(n_simulations):
            winner_is_d1, history = self.run_head_to_head_history(d1_pit, d2_pit, d1_tire, d2_tire)
            if winner_is_d1:
                d1_wins += 1
            last_history = history
        
        return {
            "d1_win_prob": (d1_wins / n_simulations) * 100,
            "d2_win_prob": ((n_simulations - d1_wins) / n_simulations) * 100,
            "lap_history": last_history 
        }