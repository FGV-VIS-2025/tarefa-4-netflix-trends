<script>
    import * as d3 from 'd3';
    import { sharedStore } from './sharedStore.js';
    import { onMount } from 'svelte';

    let svgChart;
    let XAxis, YAxis;
    let Tooltip;
    let hoveredIndex = -1;
    let totalMovies = 0;

    // Component properties
    export let width = 800, height = 500;
    export let usableArea = {
        top: 30,
        right: 30,
        bottom: 70,
        left: 50,
        width: 800 - 50 - 30,
        height: 500 - 30 - 70
    };

    // Store data subscriptions
    let scoreData = [];
    let clickedAges = [];
    let clickedYears = [];
    let clickedScores = [];

    // Subscribe to store changes
    const unsubscribeStore = sharedStore.subscribe(data => {
        scoreData = data.scoreData;
        updateTotals();
    });
    
    const unsubscribeClickedAges = sharedStore.subscribeToClickedAges(ages => {
        clickedAges = ages;
    });
    
    const unsubscribeClickedYears = sharedStore.subscribeToClickedYears(years => {
        clickedYears = years;
    });
    
    const unsubscribeClickedScores = sharedStore.subscribeToClickedScores(scores => {
        clickedScores = scores;
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

    function scoreBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredIndex = index;
        } else if (evt.type === 'mouseleave') {
            hoveredIndex = -1;
        } else if(evt.type === "click") {
            let imdbScore = scoreData[index].imdb_score;
            
            // Toggle clicked age
            if (!clickedScores.includes(imdbScore)) {
                sharedStore.clickedScores = [...clickedScores, imdbScore];
            } else {
                sharedStore.clickedScores = clickedScores.filter(c => c !== imdbScore);
            }
        }
    }

    function updateTotals() {
        totalMovies = scoreData.reduce((sum, item) => sum + item.count, 0);
    }

    $: hoveredScore = scoreData[hoveredIndex] || {};
    
    // Use all possible values for domain to keep axis consistent
    $: allScores = [...new Set(scoreData.map(d => d.imdb_score))];

    // Use filtered data for the actual bars
    $: filteredScoreValues = [...new Set(scoreData.map(d => d.imdb_score))];

    $: XScale = d3.scaleBand()
        .domain(allScores)
        .range([usableArea.left, usableArea.right])
        .padding(0.1);

    $: YMax = Math.max(d3.max(scoreData.map(d => d.count)) || 0, d3.max(scoreData.map(d => d.count)) || 0);
    
    $: YScale = d3.scaleLinear()
        .domain([0, YMax])
        .range([usableArea.bottom, usableArea.top]);

    $: {
        if (XAxis) d3.select(XAxis).call(d3.axisBottom(XScale));
        if (YAxis) d3.select(YAxis).call(d3.axisLeft(YScale));
    }
</script>

<div class="chart">
    <h2>Movies by IMDb Rating</h2>
    <div class="chart-info">
        <span class="total-counter">Total Movies: {totalMovies}</span>
    </div>
    
    <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgChart}>
            <g transform="translate(0, {usableArea.bottom})" bind:this={XAxis}/>
            <g transform="translate({usableArea.left}, 0)" bind:this={YAxis}/>
        
            <g class="bars">
            {#each scoreData as d, index}
                <rect 
                    on:mouseenter={evt => scoreBarInteraction(index, evt)}
                    on:mouseleave={evt => scoreBarInteraction(index, evt)}
                    on:click={evt => scoreBarInteraction(index, evt)}
                    
                    class:selected={clickedScores.includes(d.imdb_score)}
                    class:filtered={clickedYears.length > 0 || clickedAges.length > 0}
                    
                    x={XScale(d.imdb_score)}
                    y={YScale(d.count)}
                    width={XScale.bandwidth()}
                    height={usableArea.bottom - YScale(d.count)}
                    fill="steelblue"
                />
            {/each}
            </g>
            
            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height - 10}
            text-anchor="middle"
            font-size="12"
            >IMDb Score</text>
        
            <text
            x={-usableArea.top - usableArea.height / 2}
            y={15}
            text-anchor="middle"
            font-size="12"
            transform="rotate(-90)"
            >Number of Movies</text>
        </svg>
    
        <div class="fixed-tooltip" class:hidden={hoveredIndex === -1} bind:this={Tooltip}>
            <div class="tooltip-content">
                <strong>IMDb score:</strong> {hoveredScore.imdb_score || ''}
                <strong>Movies:</strong> {hoveredScore.count || 0}
            </div>
        </div>
    </div>
</div>

<style>
    /* GENERAL STYLES */
    * {
        box-sizing: border-box;
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
    }
    
    .chart {
        width: 45%;
        
        /* flex: 1;
        min-width: 300px; */
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
    }
    
    rect {
        transition: 200ms;
        transform-origin: center;
    }
    
    rect:hover {
        fill: lightcoral;
    }
    
    .selected {
        fill: lightcoral;
    }
    
    .filtered {
        fill: steelblue;
        opacity: c.8;
    }
    
    .filtered.selected {
        fill: lightcoral;
        opacity: 1;
    }
    
    .fixed-tooltip {
        background-color: #f9f9f9;
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
        opacity: 0.2;
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
</style>