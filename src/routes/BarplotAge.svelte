<script>
    import * as d3 from 'd3';
    import { sharedStore } from './sharedStore.js';
    import { onMount } from 'svelte';

    let svgAgeChart;
    let ageXAxis, ageYAxis;
    let ageTooltip;
    let hoveredAgeIndex = -1;
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

    // --- Adding coloring to plot ---
    // Age certification color scheme - this will be consistent for other plots
    const ageCertificationColors = {
        'R': '#006400',       // Dark green
        'PG': '#377EB8',      // Blue
        'TV-14': '#4DAF4A',   // Green
        'PG-13': '#984EA3',   // Purple
        'TV-MA': '#FF7F00',   // Orange
        'TV-PG': '#FFFF33',   // Yellow
        'TV-Y': '#A65628',    // Brown
        'TV-G': '#F781BF',    // Pink
        'TV-Y7': '#999999',   // Gray
        'G': '#66C2A5',       // Teal
        'NC-17': '#FC8D62'    // Coral
    };

    // Get color for a given age certification
    function getColorForAge(ageCertification) {
        return ageCertificationColors[ageCertification] || '#777777'; // Default gray for unknown values
    }

    // --- Fixing the age order in the x axis ---
    const fixedAgeOrder = [
        'R',
        'PG',
        'TV-14',
        'PG-13',
        'TV-MA',
        'TV-PG',
        'TV-Y',
        'TV-G',
        'TV-Y7',
        'G',
        'NC-17'
    ]
    
    // Use all possible values for domain to keep axis consistent, but in our fixed order
    // $: allAges = fixedAgeOrder.filter(age => ageData.some(d => d.age_certification === age));
    $: allAges = fixedAgeOrder;
    
    $: ageXScale = d3.scaleBand()
        .domain(allAges)
        .range([usableArea.left + 20, usableArea.right])
        .padding(0.1);

    $: hoveredAge = ageData[hoveredAgeIndex] || {};
    
    $: ageYMax = Math.max(d3.max(ageData.map(d => d.count)) || 0, d3.max(ageData.map(d => d.count)) || 0);
    
    $: ageYScale = d3.scaleLinear()
        .domain([0, ageYMax])
        .range([usableArea.bottom, usableArea.top]);

    $: {
        if (ageXAxis) d3.select(ageXAxis).call(d3.axisBottom(ageXScale)).style("font-size", "14px");
        if (ageYAxis) d3.select(ageYAxis).call(d3.axisLeft(ageYScale)).style("font-size", "14px");
    }
</script>

<div class="chart">
    <h2>Movies by Age Certification</h2>
    
    <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgAgeChart} style="background-color: inherit; border: 0">
            <g transform="translate(0, {usableArea.bottom - 10})" color="#f5f5f1" bind:this={ageXAxis} style="font-size: 1.2em;"/>
            <g transform="translate({usableArea.left + 20}, -10)" color="#f5f5f1" bind:this={ageYAxis} style="font-size: 1.2em;"/>
        
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
                    fill={getColorForAge(d.age_certification)}
                    stroke="#000"
                    stroke-width="0.5"
                    opacity={clickedAges.length > 0 && !clickedAges.includes(d.age_certification) ? 0.3 : 1}
                    width={ageXScale.bandwidth()}
                    height={usableArea.bottom - ageYScale(d.count)}
                />
            {/each}
            </g>
            
            <text
            x={(usableArea.left + usableArea.right) / 2}
            y={height + 30}
            text-anchor="middle"
            font-size="22"
            fill="#f5f5f1"
            font-weight="bold"
            >Age Certification</text>
        
            <text
            x={-usableArea.top - usableArea.height / 2}
            y={-10}
            text-anchor="middle"
            font-size="22"
            transform="rotate(-90)"
            fill="#f5f5f1"
            font-weight="bold"
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

        margin-bottom: 15px;
        background-color: #221f1f;
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
        /* fill: #b81d24; */
        /* opacity: 0.5; */
    }
    
    rect:hover {
        /* opacity: 0.8; */
    }
    
    .selected {
        /* opacity: 1; */
    }
    
    .fixed-tooltip {
        background-color: #131834;
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

    h2, text{
        margin: 0;
        margin-bottom: 2px;
        color: #f5f5f1;
    }
    h2::after{
        color: #f5f5f1;
    }
</style>