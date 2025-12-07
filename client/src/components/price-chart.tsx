import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, AreaSeries, Time } from "lightweight-charts";
import { ethers } from "ethers";

interface PriceChartProps {
    timeframe: string;
}

export default function PriceChart({ timeframe }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null); // To store series reference
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);

  // Function to generate initial data based on timeframe
  const generateInitialData = (basePrice: number, period: string) => {
      const data: any[] = [];
      const now = Math.floor(Date.now() / 1000);
      let interval = 60; // default 1 minute
      let count = 100;

      switch(period) {
          case '1s':
              interval = 1;
              count = 60;
              break;
          case '1H':
              interval = 60;
              count = 60;
              break;
          case '1D':
              interval = 3600; // 1 hour candles
              count = 24;
              break;
          case '1W':
              interval = 3600 * 4; // 4 hour candles
              count = 42; // ~1 week
              break;
          case '1M':
              interval = 86400; // 1 day candles
              count = 30;
              break;
          default:
              interval = 60;
      }

      let currentP = basePrice;
      for (let i = count; i > 0; i--) {
          // Add some volatility
          currentP += (Math.random() - 0.5) * (basePrice * 0.005); 
          data.push({
              time: (now - (i * interval)) as Time,
              value: currentP
          });
      }
      return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#3b1f69', style: 2 }, // Dotted
        horzLines: { color: '#3b1f69', style: 2 }, // Dotted
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#3b1f69',
      },
      rightPriceScale: {
        borderColor: '#3b1f69',
      },
    });

    chartRef.current = chart;

    // Use Area Series for the "Stepped Line" look (approximated with line)
    // V5 Syntax: chart.addSeries(AreaSeries, options)
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#f97316', // Orange-500 to match image
      topColor: 'rgba(249, 115, 22, 0.2)', 
      bottomColor: 'rgba(249, 115, 22, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    
    seriesRef.current = series;

    // -------------------------
    // ARC CONFIGURATION
    // -------------------------
    const provider = new ethers.JsonRpcProvider(
      "https://rpc-testnet.arc.network/"
    );

    const poolAddress = "0x284C5Afc100ad14a458255075324fA0A9dfd66b1";

    // Minimal ABI
    const ABI = [
      "function getAmountOut(uint256 amountIn) view returns (uint256)"
    ];

    const pool = new ethers.Contract(poolAddress, ABI, provider);

    async function getPrice() {
      try {
        // 1 EURC (6 decimals) -> USDC (6 decimals)
        const amountIn = ethers.parseUnits("1", 6);
        const out = await pool.getAmountOut(amountIn);
        return Number(out) / 1e6;
      } catch (e) {
        console.warn("Error reading price (using mock for demo if needed):", e);
        // Fallback for demo if contract fails
        // Return a value around 7.56
        return 7.56 + (Math.random() * 0.02 - 0.01);
      }
    }

    // Initial Data Load
    // We'll use a base price around 7.56 to start generating history
    // Ideally we would fetch the current price first, but for speed we can start generating
    // and then correct/append live data.
    const initialData = generateInitialData(7.56, timeframe);
    series.setData(initialData);

    async function tick() {
      const price = await getPrice();
      if (!price) return;

      setCurrentPrice(price.toFixed(4));

      const timestamp = Math.floor(Date.now() / 1000) as Time;
      series.update({ time: timestamp, value: price });
    }

    // Initial tick
    tick();

    const interval = setInterval(tick, 5000);

    // Handle resize
    const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [timeframe]); // Re-run when timeframe changes

  return (
    <div className="relative w-full">
        {currentPrice && (
             <div className="absolute top-2 left-2 z-10 flex flex-col bg-[#1c1038]/80 backdrop-blur-md border border-[#3b1f69] p-2 rounded-lg shadow-xl">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">EURC/USDC</span>
                <span className="text-2xl font-bold text-orange-500">${currentPrice}</span>
             </div>
        )}
        <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
