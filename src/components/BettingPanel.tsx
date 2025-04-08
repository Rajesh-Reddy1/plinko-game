'use client';

import React, { useState, Dispatch, SetStateAction } from 'react';

// Define props interface
interface BettingPanelProps {
  betAmount: string;
  setBetAmount: Dispatch<SetStateAction<string>>;
  riskLevel: string;
  setRiskLevel: Dispatch<SetStateAction<string>>;
  rows: number;
  setRows: Dispatch<SetStateAction<number>>;
  onPlaceBet: () => void; // Function to trigger bet in parent
}

const BettingPanel: React.FC<BettingPanelProps> = ({
  betAmount,
  setBetAmount,
  riskLevel,
  setRiskLevel,
  rows,
  setRows,
  onPlaceBet,
}) => {
  // Removed internal state for betAmount, riskLevel, rows as they are now props
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  const handleBet = () => {
    console.log(`BettingPanel: Bet button clicked. Amount=${betAmount}, Risk=${riskLevel}, Rows=${rows}`);
    onPlaceBet(); // Call the handler passed from the parent
  };

  const handleHalfBet = () => {
    const currentAmount = parseFloat(betAmount);
    if (isNaN(currentAmount) || currentAmount <= 0) return; // Ignore invalid or zero amounts

    // Define a minimum bet if needed, e.g., 0.00001 for BTC
    const minBet = 0.00001;
    let newAmount = currentAmount / 2;

    // Prevent going below minimum bet
    if (newAmount < minBet) {
      newAmount = minBet;
    }

    // Format to a fixed number of decimal places (e.g., 5 for BTC)
    setBetAmount(newAmount.toFixed(5));
  };

  const handleDoubleBet = () => {
    const currentAmount = parseFloat(betAmount);
    if (isNaN(currentAmount)) return; // Ignore invalid amounts

    const newAmount = currentAmount * 2;

    // Format to a fixed number of decimal places (e.g., 5 for BTC)
    setBetAmount(newAmount.toFixed(5));
  };


  return (
    <div className="flex flex-col space-y-4 p-4 bg-gray-800 rounded-lg h-full">
      {/* Mode Selection */}
      <div className="flex border-b border-gray-600">
        <button
          className={`flex-1 py-2 text-sm font-medium ${mode === 'manual' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setMode('manual')}
        >
          Manual
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${mode === 'auto' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setMode('auto')}
          disabled // Auto mode not implemented yet
        >
          Auto
        </button>
      </div>

      {/* Bet Amount */}
      <div className="space-y-2">
        <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300">Bet Amount</label>
        <div className="flex items-center space-x-2">
          <input
            type="number" // Use number for easier handling, format display later
            id="betAmount"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-blue-500 focus:border-blue-500"
            step="0.00001" // Example step for BTC
          />
          <span className="text-gray-400 text-sm">BTC</span> {/* Static Label */}
        </div>
        <div className="flex space-x-2">
          <button onClick={handleHalfBet} className="flex-1 py-1 px-2 bg-gray-600 hover:bg-gray-500 rounded text-sm">½</button>
          <button onClick={handleDoubleBet} className="flex-1 py-1 px-2 bg-gray-600 hover:bg-gray-500 rounded text-sm">2x</button>
        </div>
        <div className="text-xs text-gray-400 text-right">≈ $1.00 USD</div> {/* Static Label */}
      </div>

      {/* Risk Level */}
      <div className="space-y-1">
        <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-300">Risk</label>
        <select
          id="riskLevel"
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        <label htmlFor="rows" className="block text-sm font-medium text-gray-300">Rows</label>
        <select
          id="rows"
          value={rows}
          onChange={(e) => setRows(parseInt(e.target.value, 10))}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-blue-500 focus:border-blue-500"
        >
          {/* Generate options from 8 to 16 */}
          {Array.from({ length: 9 }, (_, i) => i + 8).map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      {/* Bet Button */}
      <button
        onClick={handleBet} // Keep using internal handler which now calls prop
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded text-white font-bold text-lg"
      >
        Bet
      </button>

      {/* Placeholders */}
      <div className="pt-4 border-t border-gray-700 text-center text-xs text-gray-500 space-y-1">
        <div>Settings | History | Fairness</div>
      </div>
    </div>
  );
};

export default BettingPanel;