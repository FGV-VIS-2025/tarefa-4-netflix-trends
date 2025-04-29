<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import { computePosition, autoPlacement, offset } from '@floating-ui/dom';
    
    let svgContainer;
    let xAxis, yAxis;
    let tooltip;
    let data = [];
    let credits = [];
    let actorList = []; 
    let actorToMovies = new Map();
    let selectedActor = "";
    let searchTerm = "";
    let hoveredMovie = null;
    let cursor = { x: 0, y: 0 };
    let tooltipPosition = { x: 0, y: 0 };
    
    let width = 800, height = 500;
    let margin = { top: 20, right: 30, bottom: 50, left: 50 };
    let usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    };
    
    const jitterAmount = 5;
    
    onMount(async () => {
      data = await d3.csv('/data/titles.csv', d => ({
        id: d.id,  
        title: d.title,
        release_year: +d.release_year,
        imdb_score: +d.imdb_score
      }));
    
      data = data.filter(d => d.id && d.title && !isNaN(d.release_year) && !isNaN(d.imdb_score));
    
      // Carrega os créditos de atores
      credits = await d3.csv('/data/credits_actors.csv', d => ({
        id: d.id,
        name: d.name,
        character: d.character
      }));
    
      // Monta a lista de atores
      actorList = Array.from(new Set(credits.map(d => d.name))).sort();
    
      // Monta o mapeamento de ator -> Set de filmes
      for (const credit of credits) {
        if (!actorToMovies.has(credit.name)) {
          actorToMovies.set(credit.name, new Set());
        }
        actorToMovies.get(credit.name).add(credit.id);
      }
    });
    
    async function dotInteraction(index, evt) {
      let hoveredDot = evt.target;
      if (evt.type === "mouseenter") {
        hoveredMovie = filteredData[index];
        cursor = { x: evt.clientX, y: evt.clientY };
        tooltipPosition = await computePosition(hoveredDot, tooltip, {
          strategy: "fixed",
          middleware: [offset(5), autoPlacement()],
        });
      } else if (evt.type === "mouseleave") {
        hoveredMovie = null;
      }
    }
    
    $: xExtent = d3.extent(data, d => d.release_year);
    $: yExtent = [0, 10];
    
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
    
    // Filtra dinamicamente baseado em searchTerm e selectedActor
    $: filteredData = data.filter(d => {
      const matchesTitle = d.title.toLowerCase().includes(searchTerm.toLowerCase());
    
      let matchesActor = true;
      if (selectedActor && actorToMovies.has(selectedActor)) {
        matchesActor = actorToMovies.get(selectedActor).has(d.id);
      }
    
      return matchesTitle && matchesActor;
    });
</script>

<h1>IMDb Scores x Ano de Lançamento</h1>

<dl class="info tooltip" hidden={hoveredMovie === null} style="top: {tooltipPosition.y}px; left: {tooltipPosition.x}px" bind:this={tooltip}>
  <dt>Título</dt>
  <dd>{hoveredMovie?.title}</dd>
  
  <dt>Ano</dt>
  <dd>{hoveredMovie?.release_year}</dd>
  
  <dt>IMDb Score</dt>
  <dd>{hoveredMovie?.imdb_score}</dd>
</dl>

<input
  type="text"
  placeholder="Pesquisar atores..."
  bind:value={selectedActor}
  list="actors"
  style="margin-bottom: 20px; padding: 8px; font-size: 16px; width: 300px;"
/>

<datalist id="actors">
  {#each actorList as actor}
    <option value={actor}>{actor}</option>
  {/each}
</datalist>

<input
  type="text"
  placeholder="Pesquisar filmes..."
  bind:value={searchTerm}
  style="margin-bottom: 20px; padding: 8px; font-size: 16px; width: 300px;"
/>

<svg viewBox={`0 0 ${width} ${height}`} bind:this={svgContainer}>
  <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
  <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />

  <g class="dots">
    {#each filteredData as d, index}
      <circle
        on:mouseenter={evt => dotInteraction(index, evt)}
        on:mouseleave={evt => dotInteraction(index, evt)}
        cx={xScale(d.release_year) + (Math.random() - 0.5) * jitterAmount}
        cy={yScale(d.imdb_score) + (Math.random() - 0.5) * jitterAmount}
        r="4"
        fill="steelblue"
        fill-opacity="0.7"
      />
    {/each}
  </g>

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
      transform: scale(1.2);
      fill: orange;
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
</style>
