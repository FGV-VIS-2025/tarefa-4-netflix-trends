<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';

    let svgContainer1;
    let svgContainer2;
    let ageXAxis;
    let ageYAxis;
    let yearXAxis;
    let yearYAxis;
    let ageTooltip;
    let yearTooltip;
    let data = [];
    let ageData = [];
    let filteredAgeData = [];
    let hoveredAgeIndex = -1;
    let hoveredYearIndex = -1;
    let width = 800;
    let height = 500;
    let margin = { top: 20, right: 30, bottom: 50, left: 50 };
    let cursor = { x: 0, y: 0 };
    let tooltipPosition = { x: 0, y: 0 };
    let clickedAges = [];
    let clickedYears = [];
    let releaseYearData = [];
    let filteredYearData = [];
    let totalMoviesAge = 0;
    let totalMoviesYear = 0;

    let usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left
    };

    usableArea.width = usableArea.right - usableArea.left;
    usableArea.height = usableArea.bottom - usableArea.top;

    onMount(async () => {
        // Load the CSV data
        data = await d3.csv('/data/titles.csv', d => ({
            title: d.title,
            age_certification: d.age_certification,
            release_year: d.release_year
        }));
        
        console.log(data);
        processAllData();
    });
    
    // Function to process all data
    function processAllData() {
        // Process the data for age certification
        processAgeData();
        
        // Process data for release years
        processYearData();
        
        // Initialize filtered data with all data
        filteredAgeData = [...ageData];
        filteredYearData = [...releaseYearData];
        
        // Calculate total movies for both charts
        updateTotals();
    }
    
    // Process age certification data
    function processAgeData(yearFilter = null) {
        const ageCounts = {};
        
        // Filter data based on selected years if provided
        const dataToProcess = yearFilter 
            ? data.filter(item => yearFilter.includes(item.release_year))
            : data;
            
        dataToProcess.forEach(item => {
            if (item.age_certification) {
                ageCounts[item.age_certification] = (ageCounts[item.age_certification] || 0) + 1;
            }
        });

        // Convert to array format for D3
        ageData = Object.entries(ageCounts).map(([age_certification, count]) => ({
            age_certification,
            count: Number(count),
        }));
        
        // Update filtered data if no explicit filter is applied
        if (!yearFilter) {
            filteredAgeData = [...ageData];
        }
    }
    
    // Process release year data
    function processYearData(ageFilter = null) {
        const releaseYearCounts = {};
        
        // Filter data based on selected age certifications if provided
        const dataToProcess = ageFilter 
            ? data.filter(item => ageFilter.includes(item.age_certification))
            : data;
        
        dataToProcess.forEach(item => {
            if (item.release_year) {
                releaseYearCounts[item.release_year] = (releaseYearCounts[item.release_year] || 0) + 1;
            }
        });

        // Convert to array format for D3
        releaseYearData = Object.entries(releaseYearCounts).map(([release_year, count]) => ({
            release_year,
            count: Number(count),
        }));
        
        // Update filtered data if no explicit filter is applied
        if (!ageFilter) {
            filteredYearData = [...releaseYearData];
        }
    }
    
    // Calculate total movies in each chart
    function updateTotals() {
        totalMoviesAge = filteredAgeData.reduce((sum, item) => sum + item.count, 0);
        totalMoviesYear = filteredYearData.reduce((sum, item) => sum + item.count, 0);
    }
    
    // Function to update charts when filters change
    function updateCharts() {
        // Update age data based on selected years
        if (clickedYears.length > 0) {
            processAgeData(clickedYears);
            filteredAgeData = [...ageData];
        } else {
            processAgeData();
            filteredAgeData = [...ageData];
        }
        
        // Update year data based on selected age certifications
        if (clickedAges.length > 0) {
            processYearData(clickedAges);
            filteredYearData = [...releaseYearData];
        } else {
            processYearData();
            filteredYearData = [...releaseYearData];
        }
        
        // Update totals after filtering
        updateTotals();
    };

    function ageBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredAgeIndex = index;
        } else if (evt.type === 'mouseleave') {
            hoveredAgeIndex = -1;
        } else if(evt.type === "click") {
            let ageCertification = filteredAgeData[index].age_certification;
            // Toggle clicked age
            if (!clickedAges.includes(ageCertification)){
                clickedAges = [...clickedAges, ageCertification];
            } else {
                clickedAges = clickedAges.filter(c => c !== ageCertification);
            }
            console.log("clicked ages:", clickedAges);
            
            // Update both charts with new filters
            updateCharts();
        }
    }

    function yearBarInteraction(index, evt) {
        if (evt.type === 'mouseenter') {
            hoveredYearIndex = index;
        } else if (evt.type === 'mouseleave') {
            hoveredYearIndex = -1;
        } else if(evt.type === "click") {
            let year = filteredYearData[index].release_year;
            // Toggle clicked year
            if (!clickedYears.includes(year)) {
                clickedYears = [...clickedYears, year];
            } else {
                clickedYears = clickedYears.filter(y => y !== year);
            }
            console.log("clicked years:", clickedYears);
            
            // Update both charts with new filters
            updateCharts();
        }
    }

    $: hoveredAge = filteredAgeData[hoveredAgeIndex] || {};
    $: hoveredYear = filteredYearData[hoveredYearIndex] || {};
    
    // Use all possible values for domain to keep axis consistent
    $: allAges = [...new Set(ageData.map(d => d.age_certification))];
    $: allYears = [...new Set(releaseYearData.map(d => d.release_year))];
    
    // Use filtered data for the actual bars
    $: filteredAgeValues = [...new Set(filteredAgeData.map(d => d.age_certification))];
    $: filteredYearValues = [...new Set(filteredYearData.map(d => d.release_year))];
    
    $: ageXScale = d3.scaleBand()
        .domain(allAges)
        .range([usableArea.left, usableArea.right])
        .padding(0.1);
    $: yearXScale = d3.scaleBand()
        .domain(allYears)
        .range([usableArea.left, usableArea.right])
        .padding(0.1);
    
    // Use max value across all data for y-axis to maintain scale
    $: ageYMax = Math.max(d3.max(ageData.map(d => d.count)) || 0, d3.max(filteredAgeData.map(d => d.count)) || 0);
    $: ageYScale = d3.scaleLinear()
        .domain([0, ageYMax])
        .range([usableArea.bottom, usableArea.top]);
        
    $: yearYMax = Math.max(d3.max(releaseYearData.map(d => d.count)) || 0, d3.max(filteredYearData.map(d => d.count)) || 0);
    $: yearYScale = d3.scaleLinear()
        .domain([0, yearYMax])
        .range([usableArea.bottom, usableArea.top]);
    
    $: {
        if (ageXAxis) d3.select(ageXAxis).call(d3.axisBottom(ageXScale));
        if (ageYAxis) d3.select(ageYAxis).call(d3.axisLeft(ageYScale));
        if (yearXAxis) d3.select(yearXAxis).call(d3.axisBottom(yearXScale));
        if (yearYAxis) d3.select(yearYAxis).call(d3.axisLeft(yearYScale));
    }
</script>

<div class="content">
    <div class="chart">
        <h2>Movie Counts by Age Certification</h2>
        <div class="chart-info">
            <span class="total-counter">Total Movies: {totalMoviesAge}</span>
        </div>
        
        <div class="chart-container">
            <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer1}>
                <g transform="translate(0, {usableArea.bottom})" bind:this={ageXAxis}/>
                <g transform="translate({usableArea.left}, 0)" bind:this={ageYAxis}/>
                
                <g class="bars">
                    {#each filteredAgeData as d, index}
                    <rect 
                        on:mouseenter={evt => ageBarInteraction(index, evt)}
                        on:mouseleave={evt => ageBarInteraction(index, evt)}
                        on:click={evt => ageBarInteraction(index, evt)}
                        
                        class:selected={clickedAges.includes(d.age_certification)}
                        class:filtered={clickedYears.length > 0}
                        
                        x={ageXScale(d.age_certification)}
                        y={ageYScale(d.count)}
                        width={ageXScale.bandwidth()}
                        height={usableArea.bottom - ageYScale(d.count)}
                        fill="steelblue"
                    />
                    {/each}
                </g>
                    
                <text
                    x={(usableArea.left + usableArea.right) / 2}
                    y={height - 10}
                    text-anchor="middle"
                    font-size="12"
                >Classificação etária</text>
                
                <text
                    x={-usableArea.top - usableArea.height / 2}
                    y={15}
                    text-anchor="middle"
                    font-size="12"
                    transform="rotate(-90)"
                >Contagedm de filmes</text>
            </svg>
            
            <div class="fixed-tooltip" class:hidden={hoveredAgeIndex === -1} bind:this={ageTooltip}>
                <div class="tooltip-content">
                    <strong>Classificação:</strong> {hoveredAge.age_certification || ''}
                    <strong>Número de filmes:</strong> {hoveredAge.count || 0}
                </div>
            </div>
        </div>
    </div>

    <div class="chart">
        <h2>Movie Counts by Release Year</h2>
        <div class="chart-info">
            <span class="total-counter">Total Movies: {totalMoviesYear}</span>
        </div>
        
        <div class="chart-container">
            <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer2}>
                <g transform="translate(0, {usableArea.bottom})" bind:this={yearXAxis}/>
                <g transform="translate({usableArea.left}, 0)" bind:this={yearYAxis}/>
                
                <g class="bars">
                    {#each filteredYearData as d, index}
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
                    <strong>Number of Movies:</strong> {hoveredYear.count || 0}
                </div>
            </div>
        </div>
    </div>
</div>


<style>
    svg {
        overflow: visible;
        background: white;
        border: 1px solid #ccc;
        margin-bottom: 0; /* Remove bottom margin as we'll add the tooltip below */
    }
    
    rect {
        transition: 200ms;
        transform-origin: center;
        transform-box: fill-box;
    }

    rect:hover {
        transform: scale(1.01);
        fill: lightcoral;
    }

    .selected {
        fill-opacity: 1;
        fill: lightcoral;
    }
    
    .filtered {
        fill: #4682b4; /* steelblue */
        opacity: 0.8;
    }
    
    .filtered.selected {
        fill: #ff7276; /* lighter coral */
        opacity: 1;
    }
    
    h2 {
        display: flex;
        align-items: center;
        margin-top: 30px;
        margin-bottom: 15px;
    }
    
    h2::after {
        content: "";
        flex-grow: 1;
        height: 1px;
        background: #ccc;
        margin-left: 10px;
    }
    
    .chart-container {
        position: relative;
        margin-bottom: 40px;
    }
    
    .reset-button {
        position: absolute;
        right: 0;
        top: -30px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .reset-button:hover {
        background: #e0e0e0;
    }
    
    /* Fixed tooltip styles */
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
    
    .fixed-tooltip strong {
        margin-right: 5px;
        margin-left: 10px;
    }
    
    .fixed-tooltip strong:first-child {
        margin-left: 0;
    }
    
    .tooltip-content {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }
    
    /* For smaller screens, stack tooltip content vertically */
    @media (max-width: 600px) {
        .tooltip-content {
            flex-direction: column;
        }
        
        .fixed-tooltip strong {
            margin-left: 0;
            margin-right: 0;
        }
    }

    .content{
        display: flex;
        justify-content: space-between;
    }

    .chart {
        width: 48%;
    }
    
    /* Styles for the total counter */
    .chart-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 14px;
    }
    
    .total-counter {
        background-color: #f0f0f0;
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ddd;
        font-weight: bold;
    }
</style>

<!-- Add reset filter button -->
<div class="chart-controls">
    <button on:click={() => {
        clickedAges = [];
        clickedYears = [];
        processAllData();
    }} class="reset-button">Reset All Filters</button>
</div>