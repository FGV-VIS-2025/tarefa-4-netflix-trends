<script>
    import * as d3 from 'd3';
    import { sharedStore, clickedAgesStore, clickedYearsStore, clickedScoresStore } from './sharedStore.js';
    import { onMount } from 'svelte';
    
    let svgYearChart;
    let yearXAxis, yearYAxis;
    let yearTooltip;
    let hoveredYearIndex = -1;
    let totalMoviesYear = 0;
    let tooltipX = 0;
    let tooltipY = 0;

    // Component properties
    export let width = 2200, height = 400;
    let margin = { top: 20, right: 30, bottom: 50, left: 50 };
    let usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
    };

    // Store data subscriptions
    let yearData = [];
    let clickedAges = [];
    let clickedYears = [];
    let clickedScores = [];

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

    function yearBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredYearIndex = index;

            const rect = evt.target.getBoundingClientRect();
            const containerRect = svgYearChart.getBoundingClientRect();

            tooltipX = rect.x - containerRect.x + rect.width / 2 - yearTooltip.clientWidth / 2;
            tooltipY = rect.y - containerRect.y - yearTooltip.clientHeight - 20; 

        } else if (evt.type === 'mouseleave') {
            hoveredYearIndex = -1;
        } else if (evt.type === 'click') {
            let yearRelease = yearData[index].release_year;
            
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
        if (yearXAxis) {
            d3.select(yearXAxis)
                .call(d3.axisBottom(yearXScale))
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('transform', 'rotate(-45)');
        }
        if (yearYAxis) d3.select(yearYAxis).call(d3.axisLeft(yearYScale));
    }
</script>

<div class="chart">
    <h2>Movies by Release Year</h2>
        
        <div class="chart-container">
        <svg viewBox={`0 0 ${width } ${height}`} bind:this={svgYearChart} style="background-color: inherit; border: 0">
            <g transform="translate(0, {usableArea.bottom})" color="#f5f5f1" bind:this={yearXAxis}/>
            <g transform="translate({usableArea.left}, 0)" color="#f5f5f1" bind:this={yearYAxis}/>
            
            <g class="bars">
            {#each yearData as d, index}
                <rect
                    on:mouseenter={evt => yearBarInteraction(index, evt)}
                    on:mouseleave={evt => yearBarInteraction(index, evt)}
                    on:click={evt => yearBarInteraction(index, evt)}
                    
                    class:selected={clickedYears.includes(d.release_year)}
                    class:filtered={clickedAges.length > 0 || clickedScores.length > 0}

                    x={yearXScale(d.release_year)}
                    y={yearYScale(d.count)}
                    width={yearXScale.bandwidth()}
                    height={usableArea.bottom - yearYScale(d.count)}
                />
            {/each}
            </g>

            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height + 10}
            text-anchor="middle"
            font-size="24"
            fill="#f5f5f1"
            >Release Year</text>
            
            <text
            x={-usableArea.top - usableArea.height / 2}
            y={0}
            text-anchor="middle"
            font-size="24"
            transform="rotate(-90)"
            fill="#f5f5f1"
            >Number of Movies</text>
        </svg>
        
        <div
        class="fixed-tooltip"
        class:hidden={hoveredYearIndex === -1}
        bind:this={yearTooltip}
        style={`left: ${tooltipX}px; top: ${tooltipY}px; position: absolute;`}>
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
        height: 100%;

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
        
        height: 90%;

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

    svg g {
        font-size: 1.2em;
    }

    h2, text{
        margin: 0;
        margin-bottom: 2px;
        color: #f5f5f1;
    }
    h2::after{
        color: #f5f5f1;
    }
</style>