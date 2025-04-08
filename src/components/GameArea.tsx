'use client'; // Required for hooks like useRef and useEffect

import React, { useRef, useEffect } from 'react'; // Removed useState again as numberOfRows is now a prop
import Matter from 'matter-js';

// Define props interface
interface GameAreaProps {
  numberOfRows: number;
  riskLevel: string; // Will be used later for dynamic multipliers
  betTrigger: number; // Counter to trigger ball drop
}

const GameArea: React.FC<GameAreaProps> = ({
  numberOfRows,
  riskLevel, // Currently unused, but passed for future use
  betTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  // Store Matter.js instances in refs to persist across renders
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const binsRef = useRef<Matter.Body[]>([]); // Ref to store generated bins for drawing text
  // --- Game Configuration ---
  // Removed internal state for numberOfRows as it's now a prop
  const pegRadius = 5; // Adjust as needed
  const pegOptions = {
    isStatic: true,
    restitution: 0.5, // Bounciness
    friction: 0.1,
    render: {
      fillStyle: '#FFFFFF', // White pegs
    }
  };
  // --- Ball Configuration ---
  const ballRadius = 7; // Slightly larger than pegs
  const ballOptions = {
    restitution: 0.5, // Reduced Bounciness
    friction: 0.05,
    density: 0.01, // Affects mass
    label: 'ball', // Label for collision detection
    render: {
      fillStyle: '#F56565', // Red ball
    }
  };

  // --- Ball Creation Logic ---
  const createBall = (canvasWidth: number, firstRowPegs: Matter.Body[]): Matter.Body => {
    let minX = canvasWidth * 0.4; // Default fallback start range
    let maxX = canvasWidth * 0.6; // Default fallback end range

    if (firstRowPegs.length >= 3) {
      // Calculate drop range based on the first 3 pegs of the first row
      const firstPegX = firstRowPegs[0].position.x;
      const thirdPegX = firstRowPegs[2].position.x;
      // Add a little padding around the outer pegs
      minX = firstPegX - pegRadius * 2;
      maxX = thirdPegX + pegRadius * 2;
    } else if (firstRowPegs.length > 0) {
       // Fallback if less than 3 pegs (shouldn't happen with new logic)
       minX = firstRowPegs[0].position.x - pegRadius * 4;
       maxX = firstRowPegs[firstRowPegs.length - 1].position.x + pegRadius * 4;
    }

    // Ensure minX/maxX are within canvas bounds somewhat
    minX = Math.max(minX, ballRadius * 2);
    maxX = Math.min(maxX, canvasWidth - ballRadius * 2);

    // Start slightly above the canvas, within the calculated horizontal span
    const x = Math.random() * (maxX - minX) + minX;
    const y = -20; // Start above the canvas view
    return Matter.Bodies.circle(x, y, ballRadius, ballOptions);
  };

  // --- Ball Drop Handler ---
  const dropBall = (firstRowPegs: Matter.Body[]) => {
    if (!engineRef.current || !containerRef.current) {
      console.error("Engine or container not ready for ball drop.");
      return;
    }
    const ball = createBall(containerRef.current.clientWidth, firstRowPegs);
    Matter.Composite.add(engineRef.current.world, ball);
    console.log("Ball dropped:", ball);
  };

  // --- Peg Generation Logic ---
  const generatePegs = (rows: number, canvasWidth: number, canvasHeight: number) => {
    const pegs: Matter.Body[] = [];
    // Adjust spacing calculation based on the maximum number of pegs in the last row (rows + 2)
    const maxPegsInRow = rows + 2;
    const horizontalSpacing = canvasWidth / (maxPegsInRow + 1); // Spacing based on the widest row + gaps
    const verticalSpacing = canvasHeight * 0.7 / rows; // Use 70% of height for pegs
    const topOffset = canvasHeight * 0.15; // Start pegs lower down

    for (let row = 0; row < rows; row++) {
      const numPegsInRow = row + 3; // Start with 3 pegs in row 0
      const y = topOffset + row * verticalSpacing;
      const rowContentWidth = (numPegsInRow - 1) * horizontalSpacing;
      const startX = (canvasWidth - rowContentWidth) / 2; // Center the row

      for (let i = 0; i < numPegsInRow; i++) {
        const x = startX + i * horizontalSpacing;
        const peg = Matter.Bodies.circle(x, y, pegRadius, pegOptions);
        Matter.Body.setStatic(peg, true); // Ensure it's static
        pegs.push(peg);
      }
    }
    return pegs;
  };
  // --- Risk Level Configuration ---
  // Example: Define multipliers and colors per risk level for 8 rows
  // In a real app, these might be fetched or calculated more dynamically based on rows
  const riskConfig: Record<string, { multipliers: number[], colors: string[] }> = {
    low: {
      multipliers: [1.5, 1.1, 1, 0.8, 0.5, 0.8, 1, 1.1, 1.5], // 9 bins for 8 rows
      colors: ['#6495ED', '#7FDBFF', '#ADD8E6', '#B0E0E6', '#B0C4DE', '#B0E0E6', '#ADD8E6', '#7FDBFF', '#6495ED'], // Blues/Light Blues
    },
    medium: {
      multipliers: [5, 2, 1.1, 0.5, 0.3, 0.5, 1.1, 2, 5],
      colors: ['#DE3163', '#FF7F50', '#FFBF00', '#CCCCFF', '#DDA0DD', '#CCCCFF', '#FFBF00', '#FF7F50', '#DE3163'], // Pinks/Oranges/Purples
    },
    high: {
      multipliers: [26, 5, 1.5, 0.3, 0.1, 0.3, 1.5, 5, 26], // Higher highs and lows
      colors: ['#DC143C', '#FF4500', '#FF8C00', '#FFD700', '#FFE4B5', '#FFD700', '#FF8C00', '#FF4500', '#DC143C'], // Reds/Oranges
    }
  };

  // --- Bin Generation Logic ---
  const generateBins = (rows: number, risk: string, canvasWidth: number, canvasHeight: number) => {
    const bins: Matter.Body[] = [];
    const numberOfBins = rows + 1;
    const binWidth = canvasWidth / numberOfBins;
    const binHeight = canvasHeight * 0.1; // 10% of canvas height
    const binY = canvasHeight - binHeight / 2; // Position at the bottom

    // Select config based on risk, default to medium if invalid or not found for current rows
    // NOTE: This example only has config for 8 rows. A real implementation needs configs for 8-16 rows.
    const currentRiskConfig = riskConfig[risk] || riskConfig.medium;
    const multipliers = currentRiskConfig.multipliers;
    const colors = currentRiskConfig.colors;

    // Ensure we have the correct number of multipliers/colors for the bins
    // Check if the selected config matches the required number of bins
    if (multipliers.length === numberOfBins && colors.length === numberOfBins) {
      // Use the selected config directly if lengths match
      for (let i = 0; i < numberOfBins; i++) {
        const x = (i + 0.5) * binWidth;
        const bin = Matter.Bodies.rectangle(x, binY, binWidth * 0.95, binHeight, {
          isStatic: true,
          label: `bin-${i}`,
          plugin: { multiplier: multipliers[i] },
          render: { fillStyle: colors[i] }
        });
        bins.push(bin);
      }
    } else {
      // Fallback: Adapt the base config (from 8 rows) if lengths don't match
      console.warn(`Multiplier/color config mismatch for ${rows} rows and ${risk} risk. Adapting base config.`);
      const baseMultipliers = currentRiskConfig.multipliers;
      const baseColors = currentRiskConfig.colors;
      const baseLength = baseMultipliers.length; // Should be 9 for the 8-row config

      for (let i = 0; i < numberOfBins; i++) {
        const x = (i + 0.5) * binWidth;
        // Cycle through the base config using modulo
        const multiplierIndex = i % baseLength;
        const colorIndex = i % baseLength;
        const adaptedMultiplier = baseMultipliers[multiplierIndex];
        const adaptedColor = baseColors[colorIndex];

        const bin = Matter.Bodies.rectangle(x, binY, binWidth * 0.95, binHeight, {
          isStatic: true,
          label: `bin-${i}`,
          plugin: { multiplier: adaptedMultiplier },
          render: { fillStyle: adaptedColor }
        });
        bins.push(bin);
      }
      }

    binsRef.current = bins; // Store bins in ref
    return bins;
  };

  // Effect for initializing and cleaning up Matter.js world based on rows/risk
  // Ref to store the pegs of the first row for ball drop positioning
  const firstRowPegsRef = useRef<Matter.Body[]>([]);

  // Effect for initializing and cleaning up Matter.js world based on rows/risk
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      console.error("Canvas or container ref not found");
      return;
    }

    // Initialize Matter.js Engine, Renderer, Runner
    const engine = Matter.Engine.create();
    engine.gravity.y = 0.8; // Adjust gravity as needed
    const world = engine.world;
    engineRef.current = engine; // Store engine instance

    const render = Matter.Render.create({
      element: container, // Render within the container div
      canvas: canvas,     // Use the specified canvas element
      engine: engine,
      options: {
        width: container.clientWidth,
        height: container.clientHeight,
        wireframes: false, // Render solid shapes
        background: 'transparent', // Make canvas background transparent
      }
    });
    renderRef.current = render; // Store render instance

    const runner = Matter.Runner.create();
    runnerRef.current = runner; // Store runner instance

    // Add basic boundaries (ground, walls)
    const wallOptions = { isStatic: true, render: { fillStyle: '#4A5568' } }; // Gray walls
    const ground = Matter.Bodies.rectangle(container.clientWidth / 2, container.clientHeight + 25, container.clientWidth, 50, wallOptions); // Ground below canvas
    const leftWall = Matter.Bodies.rectangle(-25, container.clientHeight / 2, 50, container.clientHeight, wallOptions);
    const rightWall = Matter.Bodies.rectangle(container.clientWidth + 25, container.clientHeight / 2, 50, container.clientHeight, wallOptions);
    // Top boundary (optional, balls start above)
    // const ceiling = Matter.Bodies.rectangle(container.clientWidth / 2, -25, container.clientWidth, 50, wallOptions);

    // Generate pegs
    const pegs = generatePegs(numberOfRows, container.clientWidth, container.clientHeight);
    // Store the first 3 pegs (or fewer if less than 3 generated, though unlikely now)
    firstRowPegsRef.current = pegs.slice(0, 3);

    // Generate bins
    const bins = generateBins(numberOfRows, riskLevel, container.clientWidth, container.clientHeight); // Pass riskLevel

    Matter.Composite.add(world, [ground, leftWall, rightWall, ...pegs, ...bins]); // Add pegs and bins to the world

    // Run the engine and renderer
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);
    console.log("Matter.js engine and renderer started.");

    // --- Draw Multipliers on Bins ---
    const drawBinMultipliers = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !binsRef.current) return;

      ctx.font = 'bold 12px Arial'; // Adjust font size/family as needed
      ctx.fillStyle = 'white'; // Text color
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      binsRef.current.forEach(bin => {
        const multiplier = bin.plugin.multiplier || '?';
        const text = `${multiplier}x`;
        ctx.fillText(text, bin.position.x, bin.position.y);
      });
    };

    Matter.Events.on(render, 'afterRender', drawBinMultipliers);

    // --- Collision Detection ---
    const handleCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
      const pairs = event.pairs;

      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        let ball: Matter.Body | null = null;
        let bin: Matter.Body | null = null;

        // Identify ball and bin in the collision pair
        if (bodyA.label === 'ball' && bodyB.label?.startsWith('bin-')) {
          ball = bodyA;
          bin = bodyB;
        } else if (bodyB.label === 'ball' && bodyA.label?.startsWith('bin-')) {
          ball = bodyB;
          bin = bodyA;
        }

        if (ball && bin) {
          const multiplier = bin.plugin.multiplier || 'N/A';
          console.log(`Ball hit bin: ${bin.label}, Multiplier: ${multiplier}`);

          // Make ball static briefly to stop it bouncing out crazily
          Matter.Body.setStatic(ball, true);

          // Remove the ball after a short delay
          setTimeout(() => {
            if (engineRef.current) {
              Matter.World.remove(engineRef.current.world, ball!);
              console.log("Ball removed after hitting bin.");
            }
          }, 500); // Adjust delay as needed (milliseconds)
        }
      });
    };

    Matter.Events.on(engine, 'collisionStart', handleCollision);

    // Example: Set canvas size based on container
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      // Keep aspect ratio square for simplicity, adjust as needed
      canvas.height = container.clientWidth;

      // Update Matter.js render bounds on resize
      if (renderRef.current) {
        renderRef.current.bounds.max.x = container.clientWidth;
        renderRef.current.bounds.max.y = container.clientHeight;
        renderRef.current.options.width = container.clientWidth;
        renderRef.current.options.height = container.clientHeight;
        Matter.Render.setPixelRatio(renderRef.current, window.devicePixelRatio); // Adjust pixel ratio
      }
      console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    };

    resizeCanvas(); // Initial size
    window.addEventListener('resize', resizeCanvas); // Adjust on window resize

    // Cleanup function
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // Remove collision listener on cleanup
      if (engineRef.current) {
        Matter.Events.off(engineRef.current, 'collisionStart', handleCollision);
      }
      // Remove afterRender listener on cleanup
      if (renderRef.current) {
        Matter.Events.off(renderRef.current, 'afterRender', drawBinMultipliers);
      }
      // --- Matter.js cleanup ---
      if (renderRef.current) {
        Matter.Render.stop(renderRef.current);
        // Use engineRef for cleanup
        if (engineRef.current) {
          Matter.World.clear(engineRef.current.world, false); // Clear world using engineRef
          Matter.Engine.clear(engineRef.current); // Clear engine using engineRef
        }
        renderRef.current.canvas.remove();
        // renderRef.current.textures = {}; // Deprecated? Check Matter.js docs if needed
        console.log("Matter.js renderer stopped and cleared.");
      }
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
        console.log("Matter.js runner stopped.");
      }
    };

    // Re-run this effect if the number of rows or risk level changes
  }, [numberOfRows, riskLevel]);

  // Effect for handling ball drops triggered by parent
  useEffect(() => {
    // Only drop ball if trigger is > 0 (initial state is 0)
    if (betTrigger > 0) {
      console.log("GameArea: Bet triggered, dropping ball.");
      dropBall(firstRowPegsRef.current); // Pass first row pegs to dropBall
    }
    // We only want this effect to run when betTrigger changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betTrigger]);

  return (
    // Container div to manage layout and get dimensions
    // Use bg-gray-900 to match body, renderer background is transparent
    <div ref={containerRef} className="w-full aspect-square relative bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full" // Make canvas fill the container
      ></canvas>
      {/* Other elements like score display could be overlaid here */}
      {/* Removed temporary test button */}
    </div>
  );
}; // Correct closing brace for the component function

export default GameArea;