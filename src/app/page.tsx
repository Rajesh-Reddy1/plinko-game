'use client'; // Required for useState

import React, { useState } from 'react';
import GameArea from "@/components/GameArea";
import BettingPanel from "@/components/BettingPanel";

export default function Home() {
  // --- Shared State ---
  const [betAmount, setBetAmount] = useState<string>("0.00001"); // Example BTC format
  const [riskLevel, setRiskLevel] = useState<string>("medium"); // low, medium, high
  const [numberOfRows, setNumberOfRows] = useState<number>(8); // 8-16
  const [betTrigger, setBetTrigger] = useState<number>(0); // State to trigger bet action

  // Function to trigger a new bet (increments the trigger)
  const handlePlaceBet = () => {
    console.log("Home: Placing bet triggered");
    setBetTrigger(prev => prev + 1); // Increment to trigger useEffect in GameArea
  };

  return (
    <main className="flex min-h-screen p-4">
      {/* Left Panel: Betting Controls */}
      {/* Use BettingPanel component, keep container for layout */}
      <div className="w-1/4 max-w-xs border-r border-gray-700">
        <BettingPanel
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          riskLevel={riskLevel}
          setRiskLevel={setRiskLevel}
          rows={numberOfRows}
          setRows={setNumberOfRows}
          onPlaceBet={handlePlaceBet} // Pass bet trigger function
        />
      </div>

      {/* Right Panel: Game Area */}
      <div className="flex-grow p-4">
        <h1 className="text-2xl font-bold mb-4 text-center">Plinko Game</h1>
        {/* Placeholder for game canvas */}
        <GameArea
          numberOfRows={numberOfRows}
          riskLevel={riskLevel}
          betTrigger={betTrigger} // Pass bet trigger state
        />
        {/* Placeholder for payout bins */}
        <div className="mt-4 h-16 bg-gray-800 rounded flex items-center justify-center text-gray-500">
          Payout Bins Area
        </div>
      </div>
    </main>
  );
}
