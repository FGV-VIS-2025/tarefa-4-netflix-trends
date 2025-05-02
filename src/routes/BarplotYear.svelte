<script>
    import * as d3 from 'd3';
    import { sharedStore } from './sharedStore.js';
    import { onMount } from 'svelte';
    
    let svgYearChart;
    let yearXAxis, yearYAxis;
    let yearTooltip;
    let hoveredYearIndex = -1;
    let totalMoviesYear = 0;

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
    let yearData = [];
    let clickedAges = [];
    let clickedYears = [];

    // Subscribe to store changes
    const unsubscribeStore = sharedStore.subscribe(data => {
        yearData = data.yearData;
        updateTotals();
    });

    const unsubscribeClickedAges = sharedStore.subscribeToClickedAges(ages => {
        clickedAges = ages;
    });
    
    const unsubscribeClickedYears = sharedStore.subscribeToClickedYears(years => {
        clickedYears = years;
    });

    // Clean up subscriptions when component is destroyed
    onMount(() => {
        return () => {
            unsubscribeStore();
            unsubscribeClickedAges();
            unsubscribeClickedYears();
        };
    });

    function yearBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredYearIndex = index;
        } else if (evt.type === 'mouseleave') {
            hoveredYearIndex = -1;
        } else if(evt.type === "click") {
            let yearRelease = yearData[index].release_year;
            
            // Toggle clicked age
            if (!clickedYears.includes(yearRelease)) {
                sharedStore.clickedYears = [...clickedYears, yearRelease];
            } else {
                sharedStore.clickedYears = clickedYears.filter(c => c !== yearRelease);
            }
        }
    }

    function updateTotals() {
        totalMoviesYear = yearData.reduce((sum, item) => sum + item.count, 0);
    }

    $: hoveredYear = yearData[hoveredYearIndex] || {};

    $: allYears = [...new Set(yearData.map(d => d.release_year))];

    $: filteredYearValues = [...new Set(yearData.map(d => d.release_year))];

    $: yearXScale = d3.scaleBand()
        .domain(allYears)
        .range([usableArea.left, usableArea.right])
        .padding(0.1);

    $: yearYMax = Math.max(d3.max(yearData.map(d => d.count)) || 0, d3.max(yearData.map(d => d.count)) || 0);
    $: yearYScale = d3.scaleLinear()
        .domain([0, yearYMax])
        .range([usableArea.bottom, usableArea.top]);

    $:{
        if (yearXAxis) d3.select(yearXAxis).call(d3.axisBottom(yearXScale));
        if (yearYAxis) d3.select(yearYAxis).call(d3.axisLeft(yearYScale));
    }
</script>

<div class="chart">
    <h2>Movies by Release Year</h2>
    <div class="chart-info">
        <span class="total-counter">Total Movies: {totalMoviesYear}</span>
    </div>
        
        <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgYearChart}>
            <g transform="translate(0, {usableArea.bottom})" bind:this={yearXAxis}/>
            <g transform="translate({usableArea.left}, 0)" bind:this={yearYAxis}/>
            
            <g class="bars">
            {#each yearData as d, index}
                <rect
                    on:mouseenter={evt => yearBarInteraction(index, evt)}
                    on:mouseleave={evt => yearBarInteraction(index, evt)}
                    on:click={evt => yearBarInteraction(index, evt)}
                    
                    class:selected={clickedYears.includes(d.release_year)}
                    class:filtered={clickedAges.length > 0}

                    x={yearXScale(d.release_year)}
                    y={yearYScale(d.count)}
                    width={yearXScale.bandwidth()}
                    height={usableArea.bottom - yearYScale(d.count)}
                    fill="steelblue"
                />
            {/each}
            </g>

            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height - 10}
            text-anchor="middle"
            font-size="12"
            >Release Year</text>

            <text
            x={-usableArea.top - usableArea.height / 2}
            y={15}
            text-anchor="middle"
            font-size="12"
            transform="rotate(-90)"
            >Number of Movies</text>
        </svg>
        
        <div class="fixed-tooltip" class:hidden={hoveredYearIndex === -1} bind:this={yearTooltip}>
            <div class="tooltip-content">
            <strong>Release Year:</strong> {hoveredYear.release_year || ''}
            <strong>Movies:</strong> {hoveredYear.count || 0}
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
        flex: 1;
        min-width: 300px;
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