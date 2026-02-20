from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import random

app = FastAPI()

# --- 1. CORS CONFIGURATION (CRITICAL FOR VERCEL) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (Vercel, Localhost, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. DRIVER STATS DATABASE ---
def get_stats(driver_code):
    # Simulated stats: base_pace (lower is faster), consistency (lower variance is better)
    # VER is the baseline reference (0.0)
    drivers = {
        'VER': {'pace': 0.00, 'cons': 0.10}, 
        'HAM': {'pace': 0.05, 'cons': 0.12},
        'LEC': {'pace': 0.02, 'cons': 0.15},
        'NOR': {'pace': 0.03, 'cons': 0.12},
        'ALO': {'pace': 0.10, 'cons': 0.08},
        'SAI': {'pace': 0.08, 'cons': 0.14},
        'RUS': {'pace': 0.06, 'cons': 0.13},
        'PER': {'pace': 0.15, 'cons': 0.18},
    }
    return drivers.get(driver_code, {'pace': 0.20, 'cons': 0.20}) # Default for others

# --- 3. RACE SIMULATION ENGINE ---
class RaceSimulation:
    def __init__(self, d1_stats, d2_stats, track):
        self.d1 = d1_stats
        self.d2 = d2_stats
        self.track_difficulty = 1.0
        if track == 'Monaco': self.track_difficulty = 1.2 # Harder to pass/drive
        if track == 'Monza': self.track_difficulty = 0.8  # Easier/Faster

    def get_tire_data(self, compound):
        # Base Lap Time Penalty, Degradation per lap
        if compound == 'SOFT': return 0.0, 0.15 
        if compound == 'MED':  return 0.3, 0.08 
        if compound == 'HARD': return 0.6, 0.04 
        return 0.3, 0.08 # Default Med

    def run_monte_carlo_duel(self, n_simulations, d1_pit, d2_pit, d1_tire, d2_tire):
        d1_wins = 0
        total_laps = 57 # Bahrain/Typical F1 length
        pit_loss = 22.0 # Time lost in pit lane

        # Storage for the "Average Race" trace to show in UI
        avg_gap_trace = np.zeros(total_laps)

        for _ in range(n_simulations):
            # Init Race
            gap = 0.0 # Positive = D1 ahead, Negative = D2 ahead
            sim_trace = []
            
            # Tire Physics
            d1_base_pen, d1_deg = self.get_tire_data(d1_tire)
            d2_base_pen, d2_deg = self.get_tire_data(d2_tire)
            
            d1_current_deg = 0
            d2_current_deg = 0

            for lap in range(1, total_laps + 1):
                # 1. Base Pace Difference
                pace_diff = (self.d2['pace'] - self.d1['pace']) 
                
                # 2. Tire Performance (Degradation increases lap time)
                tire_perf_diff = (d2_base_pen + d2_current_deg) - (d1_base_pen + d1_current_deg)
                
                # 3. Random Variance (Consistency)
                variance = np.random.normal(0, self.d1['cons'] + self.d2['cons'])
                
                # Calculate lap delta
                lap_delta = pace_diff + tire_perf_diff + variance
                gap += lap_delta

                # 4. Pit Stop Logic
                if lap == d1_pit:
                    gap -= pit_loss # D1 loses time
                    d1_current_deg = 0 # Fresh tires (Assume Mediums for 2nd stint)
                    d1_base_pen, d1_deg = self.get_tire_data('MED') 
                
                if lap == d2_pit:
                    gap += pit_loss # D2 loses time (relative to D1)
                    d2_current_deg = 0
                    d2_base_pen, d2_deg = self.get_tire_data('MED')

                # Update Wear
                d1_current_deg += d1_deg
                d2_current_deg += d2_deg
                
                sim_trace.append(gap)

            # Check Winner
            if gap > 0: d1_wins += 1
            
            # Add to average trace
            avg_gap_trace += np.array(sim_trace)

        # Finalize Data
        avg_gap_trace /= n_simulations
        
        # Format for Recharts (Frontend)
        lap_history = [{"lap": i+1, "gap": round(g, 3)} for i, g in enumerate(avg_gap_trace)]

        return {
            "d1_win_prob": (d1_wins / n_simulations) * 100,
            "d2_win_prob": ((n_simulations - d1_wins) / n_simulations) * 100,
            "lap_history": lap_history
        }

# --- 4. ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "active", "service": "Oracle Pitwall API"}

@app.get("/duel")
def simulate_duel(d1: str, d2: str, d1_pit: int, d2_pit: int, track: str, d1_tire: str, d2_tire: str):
    try:
        # Initialize Logic
        sim = RaceSimulation(get_stats(d1), get_stats(d2), track=track)
        
        # Run Math
        result = sim.run_monte_carlo_duel(
            n_simulations=600, 
            d1_pit=d1_pit, 
            d2_pit=d2_pit,
            d1_tire=d1_tire,
            d2_tire=d2_tire
        )
        
        return {
            "meta": {"track": track, "drivers": [d1, d2]},
            "results": result
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Simulation Failed")

# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)