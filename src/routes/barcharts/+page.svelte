<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';

    let svgContainer1;
    let svgContainer2;
    let ageXAxis;
    let ageYAxis;
    let yearXAxis;
    let yearYAxis;
    let tooltip;
    let data = [];
    let ageData = [];
    let hoveredAgeIndex = -1
    let hoveredYearIndex = -1
    let width = 800;
    let height = 500;
    let margin = { top: 20, right: 30, bottom: 50, left: 50 };
    let cursor = { x: 0, y: 0 };
    let tooltipPosition = { x: 0, y: 0 };
    let clickedAges = [];
    let releaseYearData = [];

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
        
        console.log(data)

        // Process the data:  Count occurrences of each age_certification
        const ageCounts = {};
        data.forEach(item => {
            if (item.age_certification) {
                ageCounts[item.age_certification] = (ageCounts[item.age_certification] || 0) + 1;
            }
        });

        // Convert the ageCounts object into an array of objects, which d3 likes
        ageData = Object.entries(ageCounts).map(([age_certification, count]) => ({
            age_certification,
            count: Number(count), // Ensure count is a number
        }));

        // Processing data for release years
        const releaseYearCounts = {}
        data.forEach(item => {
            releaseYearCounts[item.release_year] = (releaseYearCounts[item.release_year] || 0) + 1;
        })
        console.log("releaseYearCounts", releaseYearCounts)

        releaseYearData = Object.entries(releaseYearCounts).map(([release_year, count]) => ({
            release_year,
            count: Number(count), // Ensure count is a number
        }));

        console.log("releaseYearData", releaseYearData)
    });

    async function ageBarInteraction(index, evt) {
        let hoveredBar = evt.target;
        if (evt.type === 'mouseenter') {
            hoveredIndex = index;
            cursor = { x: evt.x, y: evt.y };
        } else if (evt.type === 'mouseleave') {
            hoveredIndex = -1;
        }
        // else if(evt.type === "click") {
        //     let ageCertification = data[index].age_certification
        //     console.log("age")
        //     // Adding newly clicked commit
        //     if (!clickedAges.includes(ageCertification)){
        //         clickedAges = [...clickedAges, ageCertification]
        //     }
        //     else {
        //         clickedAges = clickedAges.filter(c => c !== ageCertification)
        //     }
        //     console.log("clicked ages:", clickedAges)
        // }
    }

    // Updates tooltip position
    $: {
        tooltipPosition.x = cursor.x + 10;  // Adjust the tooltip offset (10px from cursor)
        tooltipPosition.y = cursor.y + 10;
    }

    $: hoveredMovie = ageData[hoveredIndex] ?? hoveredMovie ?? {};
    
    $: uniqueAges = [...new Set(ageData.map(d => d.age_certification))];
    $: uniqueYears = [...new Set(releaseYearData.map(d => d.release_year))];
    
    $: ageXScale = d3.scaleBand()
    .domain(uniqueAges)
    .range([usableArea.left, usableArea.right])
    .padding(0.1);
    $: yearXScale = d3.scaleBand()
    .domain(uniqueYears)
    .range([usableArea.left, usableArea.right])
    .padding(0.1);
    
    $: ageYExtent = [0, d3.max(ageData.map(d => d.count))]
    $: ageYScale = d3.scaleLinear()
        .domain(ageYExtent)
        .range([usableArea.bottom, usableArea.top]);
    $: yearYExtent = [0, d3.max(releaseYearData.map(d => d.count))]
    $: yearYScale = d3.scaleLinear()
        .domain(yearYExtent)
        .range([usableArea.bottom, usableArea.top]);
    
    $: {
        if (ageXAxis) d3.select(ageXAxis).call(d3.axisBottom(ageXScale));
        if (ageYAxis) d3.select(ageYAxis).call(d3.axisLeft(ageYScale))
        if (yearXAxis) d3.select(yearXAxis).call(d3.axisBottom(yearXScale));
        if (yearYAxis) d3.select(yearYAxis).call(d3.axisLeft(yearYScale))
    }

</script>

<h2>
    Movie Counts by age Certification
</h2> -->

<dl class="info tooltip" hidden={hoveredIndex === -1} style="top: {tooltipPosition.y}px; left: {tooltipPosition.x}px" bind:this={tooltip}>
    <dt>Classificação</dt>
    <dd>{hoveredMovie.age_certification}</dd>
    
    <dt>Numero de filmes</dt>
    <dd>{hoveredMovie.count}</dd>
</dl>

<svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer}>
    <g transform="translate(0, {usableArea.bottom})" bind:this={ageXAxis}/>
    <g transform="translate({usableArea.left}, 0)" bind:this={ageYAxis}/>
    
    <g class="bars">
        {#each ageData as d, index}
        <rect 
        on:mouseenter={evt => barInteraction(index, evt)}
        on:mouseleave={evt => barInteraction(index, evt)}
        on:click={evt => barInteraction(index, evt)}
        
        class:selected={ clickedAges.includes(d.age_certification) }
        
        x={ageXScale(d.age_certification)}
        y={ageYScale(d.count)}
        width={ageXScale.bandwidth(d.age_certification)}
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
        
<!-- <h2>
    Movie Counts by Release Year
</h2>

<svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer}>
    <g transform="translate(0, {usableArea.bottom})" bind:this={yearXAxis}/>
    <g transform="translate({usableArea.left}, 0)" bind:this={yearYAxis}/>
    
    <g class="bars">
        {#each releaseYearData as d, index}
            <rect 
                on:mouseenter={evt => barInteraction(index, evt)}
                on:mouseleave={evt => barInteraction(index, evt)}

                x={yearXScale(d.release_year)}
                y={yearYScale(d.count)}
                width={yearXScale.bandwidth(d.release_year)}
                height={usableArea.bottom - yearYScale(d.count)}
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
</svg> -->

<style>
    svg {
        overflow: visible;
        background: white;
        border: 1px solid #ccc;
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

    .info {
        display: grid;
        margin: 0;
        grid-template-columns: 2;
        background-color: oklch(100% 0% 0 / 80%);
        box-shadow: 1px 1px 3px 3px gray;
        border-radius: 5px;
        backdrop-filter: blur(10px);
        padding: 10px;
        position: fixed;
        top: 1em;
        left: 1em;
    
        &[hidden]:not(:hover, :focus-within) {
        opacity: 0;
        visibility: hidden;
        }
    }
    
    .info dt {
        grid-column: 1;
        font-weight: bold;
        color: var(--border-gray);
        text-transform: uppercase;
    }
    
    .info dd {
        grid-column: 2;
        font-weight: normal;
    }

    .selected {
        fill-opacity: 1;
        
        fill: lightcoral;
    }
</style>