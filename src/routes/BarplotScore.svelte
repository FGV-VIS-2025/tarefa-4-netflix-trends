<script>
    import * as d3 from 'd3';
    import { sharedStore } from './sharedStore.js';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';

    let svgChart;
    let XAxis, YAxis;
    let Tooltip;
    let hoveredBin = null;
    let totalMovies = 0;
    let tooltipX = 0;
    let tooltipY = 0;

    // Component properties
    export let width = 1000, height = 500;
    export let usableArea = {
        top: 30,
        right: 30,
        bottom: 70,
        left: 50,
        width: 1000 - 50 - 30,
        height: 500 - 30 - 70
    };

    // Store data subscriptions
    let rawScoreData = [];
    let clickedAges = [];
    let clickedYears = [];
    let clickedScoresBins = [];
    
    // Histogram parameters
    const binThresholds = d3.range(0, 10.5, 0.5); // Define bin edges
    let histogramData = [];

    // Subscribe to store changes
    const unsubscribeStore = sharedStore.subscribe(data => {
        rawScoreData = data.scoreData;
        updateHistogram();
    });
    
    const unsubscribeClickedAges = sharedStore.subscribeToClickedAges(ages => {
        clickedAges = ages;
        updateHistogram();
    });
    
    const unsubscribeClickedYears = sharedStore.subscribeToClickedYears(years => {
        clickedYears = years;
        updateHistogram();
    });
    
    const unsubscribeClickedScores = sharedStore.subscribeToClickedScores(() => {
    // You might want to trigger a re-render or some other action here
    // if changes to clickedScores from other components should affect this histogram's appearance
    // For now, since the histogram itself updates clickedScores, this might be empty.
    // However, it's good practice to subscribe if you anticipate external changes.
    });

    // Clean up subscriptions when component is destroyed
    onMount(() => {
        return () => {
            unsubscribeStore();
            unsubscribeClickedAges();
            unsubscribeClickedYears();
            unsubscribeClickedScores();
        };
    });

    function updateHistogram() {
        const filteredScores = rawScoreData

        const bins = d3.bin()
            .domain([0, 10]) // Ensure domain covers the full score range
            .thresholds(binThresholds)(filteredScores);

        histogramData = bins.map(bin => ({
            x0: bin.x0,
            x1: bin.x1,
            count: bin.length
        }));
        updateTotals();
    }

    function binInteraction(bin, evt) {
        if (evt.type === 'mouseenter') {
            hoveredBin = bin;
            const rect = evt.target.getBoundingClientRect();
            const containerRect = svgChart.getBoundingClientRect();

            tooltipX = rect.x - containerRect.x + rect.width / 2;
            tooltipY = rect.y - containerRect.y - Tooltip.clientHeight/3 ;

        } else if (evt.type === 'mouseleave') {
            hoveredBin = null;
        } else if(evt.type === "click") {
            const binRange = `${bin.x0}-${bin.x1}`
            
            if (!clickedScoresBins.includes(binRange)) {
                clickedScoresBins = [...clickedScoresBins, binRange];
            } else {
                clickedScoresBins = clickedScoresBins.filter(b => b !== binRange);
            }

            // Update shared store with the selected score ranges
            const scoresInBin = rawScoreData
                .filter(item => item >= bin.x0 && item < bin.x1)

            // Update clickedScores in the store based on the selected bins
            let allScoresInClickedBins = [];
            clickedScoresBins.forEach(binRangeStr => {
                const [start, end] = binRangeStr.split('-').map(Number);
                const scoresInCurrentBin = rawScoreData
                    .filter(item => item >= start && item < end)
                allScoresInClickedBins = [...allScoresInClickedBins, ...scoresInCurrentBin];
            });

            // Remove duplicates if necessary
            sharedStore.clickedScores = [...new Set(allScoresInClickedBins)];
        }
    }

    function updateTotals() {
        totalMovies = histogramData.reduce((sum, item) => sum + item.count, 0);
    }

    $: hoveredBinData = hoveredBin || {};
    
    $: XScale = d3.scaleLinear()
        .domain([0, 10]) // Domain for the full score range
        .range([usableArea.left + 20, usableArea.right]);

    $: YMax = d3.max(histogramData.map(d => d.count));
    
    $: YScale = d3.scaleLinear()
        .domain([0, YMax])
        .range([usableArea.bottom, usableArea.top]);

    $: {
        if (XAxis) d3.select(XAxis).call(d3.axisBottom(XScale).tickValues(d3.range(0, 11, 1))).style("font-size", "14px");
        if (YAxis) d3.select(YAxis).call(d3.axisLeft(YScale)).style("font-size", "14px");
    }
</script>

<div class="chart">
    <h2>Movies by IMDb Rating</h2>
    
    <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgChart} style="background-color: inherit; border: 0">
            <g transform="translate(0, {usableArea.bottom - 10})" color="#f5f5f1" bind:this={XAxis}/>
            <g transform="translate({usableArea.left + 20}, -10)" color="#f5f5f1" bind:this={YAxis}/>
        
            <g class="bars">
            {#each histogramData as bin}
                <rect 
                    on:mouseenter={evt => binInteraction(bin, evt)}
                    on:mouseleave={evt => binInteraction(bin, evt)}
                    on:click={evt => binInteraction(bin, evt)}
                    
                    class:selected={clickedScoresBins.includes(`${bin.x0}-${bin.x1}`)}
                    class:filtered={clickedYears.length > 0 || clickedAges.length > 0}
                    
                    x={XScale(bin.x0)}
                    y={YScale(bin.count) - 10}
                    width={XScale(bin.x1) - XScale(bin.x0)}
                    height={usableArea.bottom - YScale(bin.count)}
                />
            {/each}
            </g>
            
            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height + 30}
            text-anchor="middle"
            font-size="18"
            fill="#f5f5f1"
            >IMDb Score</text>
        
            <text
            x={-usableArea.top - usableArea.height / 2}
            y={8}
            text-anchor="middle"
            font-size="18"
            transform="rotate(-90)"
            fill="#f5f5f1"
            >Number of Movies</text>
        </svg>
    
        <div
        class="fixed-tooltip"
        class:hidden={hoveredBin === null}
        bind:this={Tooltip}
        style={`left: ${tooltipX}px; top: ${tooltipY}px; position: absolute; transform: translate(-50%, -100%);`}>
            <div class="tooltip-content">
                <strong>IMDb score:</strong> {hoveredBinData.x0 || ''}
                <strong>Movies:</strong> {hoveredBinData.count || 0}
            </div>
        </div>
    </div>
</div>

<style>
    /* GENERAL STYLES */
    * {
        box-sizing: border-box;
        color: #f5f5f1;
    }
    
    h2 {
        margin-top: 20px;
        margin-bottom: 15px;
        color: #444;
        display: flex;
        align-items: center;
    }
    
    h2::after {
        content: "";
        flex-grow: 1;
        height: 1px;
        background: #ccc;
        margin-left: 10px;
    }
    
    /* SVG STYLES */
    svg {
        overflow: visible;
        background: white;
        border: 1px solid #eee;
        width: 100%;
        height: auto;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-radius: 4px;

        height: 90%;
    }
    
    .chart {
        width: 100%;
        height: 45%;
        background-color: #221f1f;
    }
    
    .chart-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .total-counter {
        background-color: #f0f0f0;
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ddd;
        font-weight: bold;
        font-size: 14px;
    }
    
    .chart-container {
        position: relative;

        height: 80%;
        
        border: 0;
        outline: #221f1f;
        background-color: inherit;
    }
    
    rect {
        transition: 200ms;
        transform-origin: center;
        fill: #b81d24;
        opacity: 0.8;
    }
    
    rect:hover {
        opacity: 0.5;
    }
    
    .selected {
        fill: #e50914;
    }
    
    .fixed-tooltip {
        background-color: #131834;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px 12px;
        margin-top: 10px;
        text-align: center;
        transition: opacity 0.3s;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        min-height: 38px;
    }
    
    .fixed-tooltip.hidden {
        opacity: 0;
    }
    
    .tooltip-content {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    }
    
    .tooltip-content strong {
        margin-right: 5px;
    }
    
    /* RESPONSIVE LAYOUTS */
    @media (max-width: 900px) {
        .chart {
            width: 100%;
        }
    }

    h2{
        margin: 0;
        margin-bottom: 2px;
        color: #f5f5f1;
    }
    h2::after{
        color: #f5f5f1;
    }
</style>