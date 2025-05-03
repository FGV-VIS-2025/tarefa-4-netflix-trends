<script>
    import * as d3 from 'd3';
    import { sharedStore } from './sharedStore.js';
    import { onMount } from 'svelte';

    let svgAgeChart;
    let ageXAxis, ageYAxis;
    let ageTooltip;
    let hoveredAgeIndex = -1;
    let totalMoviesAge = 0;
    let tooltipX = 0;
    let tooltipY = 0;

    // Component properties
    export let width, height;
    export let usableArea = {
    };

    // Store data subscriptions
    let ageData = [];
    let clickedAges = [];
    let clickedYears = [];
    let clickedScores = [];

    // Subscribe to store changes
    const unsubscribeStore = sharedStore.subscribe(data => {
        ageData = data.ageData;
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

    function ageBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredAgeIndex = index;
            const rectElement = evt.currentTarget.getBoundingClientRect();
            const containerElement = svgAgeChart.getBoundingClientRect();

            tooltipX = rectElement.left + rectElement.width / 2 - containerElement.left;
            tooltipY = rectElement.top - containerElement.top - 10; 

        } else if (evt.type === 'mouseleave') {
            hoveredAgeIndex = -1;
        } else if(evt.type === "click") {
            
            let ageCertification = ageData[index].age_certification;
            
            // Toggle clicked age
            if (!clickedAges.includes(ageCertification)) {
                sharedStore.clickedAges = [...clickedAges, ageCertification];
            } else {
                sharedStore.clickedAges = clickedAges.filter(c => c !== ageCertification);
            }
        }
    }

    function updateTotals() {
        totalMoviesAge = ageData.reduce((sum, item) => sum + item.count, 0);
    }

    $: hoveredAge = ageData[hoveredAgeIndex] || {};
    
    // Use all possible values for domain to keep axis consistent
    $: allAges = [...new Set(ageData.map(d => d.age_certification))];

    // Use filtered data for the actual bars
    $: filteredAgeValues = [...new Set(ageData.map(d => d.age_certification))];

    $: ageXScale = d3.scaleBand()
        .domain(allAges)
        .range([usableArea.left + 20, usableArea.right])
        .padding(0.1);

    $: ageYMax = Math.max(d3.max(ageData.map(d => d.count)) || 0, d3.max(ageData.map(d => d.count)) || 0);
    
    $: ageYScale = d3.scaleLinear()
        .domain([0, ageYMax])
        .range([usableArea.bottom, usableArea.top]);

    $: {
        if (ageXAxis) d3.select(ageXAxis).call(d3.axisBottom(ageXScale));
        if (ageYAxis) d3.select(ageYAxis).call(d3.axisLeft(ageYScale));
    }
</script>

<div class="chart">
    <h2>Movies by Age Certification</h2>
    <div class="chart-info">
        <span class="total-counter">Total Movies: {totalMoviesAge}</span>
    </div>
    
    <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgAgeChart}>
            <g transform="translate(0, {usableArea.bottom - 10})" bind:this={ageXAxis}/>
            <g transform="translate({usableArea.left + 20}, -10)" bind:this={ageYAxis}/>
        
            <g class="bars">
            {#each ageData as d, index}
                <rect 
                    on:mouseenter={evt => ageBarInteraction(index, evt)}
                    on:mouseleave={evt => ageBarInteraction(index, evt)}
                    on:click={evt => ageBarInteraction(index, evt)}
                    
                    class:selected={clickedAges.includes(d.age_certification)}
                    class:filtered={clickedYears.length > 0 || clickedScores.length > 0}
                    
                    x={ageXScale(d.age_certification)}
                    y={ageYScale(d.count) - 10}
                    width={ageXScale.bandwidth()}
                    height={usableArea.bottom - ageYScale(d.count)}
                    fill="steelblue"
                />
            {/each}
            </g>
            
            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height - 5}
            text-anchor="middle"
            font-size="12"
            >Age Certification</text>
        
            <text
            x={-usableArea.top - usableArea.height / 2}
            y={15}
            text-anchor="middle"
            font-size="12"
            transform="rotate(-90)"
            >Number of Movies</text>
        </svg>
    
        <div 
        class="fixed-tooltip" 
        class:hidden={hoveredAgeIndex === -1}
        bind:this={ageTooltip}
        style={`position: absolute; left: ${tooltipX}px; top: ${tooltipY}px; transform: translate(-50%, -100%);`}
        >
            <div class="tooltip-content">
                <strong>Certification:</strong> {hoveredAge.age_certification || ''}
                <strong>Movies:</strong> {hoveredAge.count || 0}
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

        height: 90%;
    }
    
    .chart {
        width: 100%;
        height: 45%;

        margin-bottom: 15px;
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

    h2 {
        margin: 0;
        margin-bottom: 2px;
    }
</style>