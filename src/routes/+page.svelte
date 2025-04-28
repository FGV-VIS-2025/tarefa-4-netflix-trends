<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
  
    let svgContainer;
    let xAxis, yAxis;
    let data = [];
  
    let width = 800, height = 500;
    let margin = { top: 20, right: 30, bottom: 50, left: 50 };
  
    let usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left
    };
  
    usableArea.width = usableArea.right - usableArea.left;
    usableArea.height = usableArea.bottom - usableArea.top;
  
    onMount(async () => {
      data = await d3.csv('/data/titles.csv', d => ({
        release_year: +d.release_year,
        imdb_score: +d.imdb_score
      }));
  
      // Filtra dados válidos
      data = data.filter(d => !isNaN(d.release_year) && !isNaN(d.imdb_score));
    });
  
    $: xExtent = d3.extent(data, d => d.release_year);
    $: yExtent = [0, 10]; // IMDb vai de 0 a 10
  
    $: xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([usableArea.left, usableArea.right])
      .nice();
  
    $: yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([usableArea.bottom, usableArea.top]);
  
    $: {
      if (xAxis) d3.select(xAxis).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
      if (yAxis) d3.select(yAxis).call(d3.axisLeft(yScale));
    }
</script>
  
<h1>IMDb Scores x Ano de Lançamento</h1>
  
<svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer}>
    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />

    <g class="dots">
        {#each data as d}
        <circle 
            cx={xScale(d.release_year)}
            cy={yScale(d.imdb_score)}
            r="3"
            fill="steelblue"
        />
        {/each}
    </g>

    <!-- Eixos títulos -->
    <text
        x={(usableArea.left + usableArea.right) / 2}
        y={height - 10}
        text-anchor="middle"
        font-size="12"
    >Ano de Lançamento</text>

    <text
        x={-usableArea.top - usableArea.height / 2}
        y={15}
        text-anchor="middle"
        font-size="12"
        transform="rotate(-90)"
    >Nota IMDb</text>
</svg>

<style>
    svg {
      overflow: visible;
      background: white;
      border: 1px solid #ccc;
    }
  
    circle {
      transition: 200ms;
      transform-origin: center;
      transform-box: fill-box;
    }
  
    circle:hover {
      transform: scale(1.5);
      fill: orange;
    }
</style>
  