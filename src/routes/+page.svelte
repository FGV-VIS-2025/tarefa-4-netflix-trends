<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { computePosition, autoPlacement, offset } from '@floating-ui/dom';
  
  // Scatter plot variables
  let svgScatter;
  let xAxisScatter, yAxisScatter;
  let tooltipScatter;
  let movieData = [];
  let credits = [];
  let actorList = []; 
  let actorToMovies = new Map();
  let selectedActor = "";
  let searchTerm = "";
  let hoveredMovie = null;
  let cursor = { x: 0, y: 0 };
  let tooltipPosition = { x: 0, y: 0 };
  let showMovies = true;
  let showShows = true;
  let clickedMovie = null;
  
  // Bar chart variables
  let svgAgeChart;
  let svgYearChart;
  let ageXAxis, ageYAxis;
  let yearXAxis, yearYAxis;
  let ageTooltip, yearTooltip;
  let ageData = [];
  let filteredAgeData = [];
  let hoveredAgeIndex = -1;
  let hoveredYearIndex = -1;
  let clickedAges = [];
  let clickedYears = [];
  let releaseYearData = [];
  let filteredYearData = [];
  let totalMoviesAge = 0;
  let totalMoviesYear = 0;
  let genreList = [];
  let selectedGenre = "";
  
  // Commons variables
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
    // Load all data
    movieData = await d3.csv('./data/titles.csv', d => ({
      id: d.id,  
      title: d.title,
      type: d.type,
      release_year: +d.release_year,
      imdb_score: +d.imdb_score,
      age_certification: d.age_certification,
      genres: d.genres ? JSON.parse(d.genres.replace(/'/g, '"')) : [],
      description: d.description || "No description available."
    }));
  
    movieData = movieData.filter(d => d.id && d.title && !isNaN(d.release_year) && !isNaN(d.imdb_score));
  
    // Load credits data
    credits = await d3.csv('./data/credits.csv', d => ({
      id: d.id,
      name: d.name,
      character: d.character,
      role: d.role
    }));
  
    // Build actor list
    actorList = Array.from(new Set(credits.map(d => d.name))).sort();

    // Build genre list
    genreList = Array.from(new Set(movieData.flatMap(d => d.genres))).sort();
  
    // Build actor to movies mapping
    for (const credit of credits) {
      if (credit.role !== "ACTOR") continue; // <-- só inclui atores
      if (!actorToMovies.has(credit.name)) {
        actorToMovies.set(credit.name, new Set());
      }
      actorToMovies.get(credit.name).add(credit.id);
    }
    
    // Process data for bar charts
    processAllData();
  });
  
  // Scatter plot functions
  async function dotInteraction(index, evt) {
    let hoveredDot = evt.target;
    if (evt.type === "mouseenter") {
      hoveredMovie = filteredData[index];
      cursor = { x: evt.clientX, y: evt.clientY };
      tooltipPosition = await computePosition(hoveredDot, tooltipScatter, {
        strategy: "fixed",
        middleware: [offset(5), autoPlacement()],
      });
    } else if (evt.type === "mouseleave") {
      hoveredMovie = null;
    }
  }

  function handleDotClick(index) {
    const movie = filteredData[index];
    const actors = credits.filter(c => c.id === movie.id && c.role === "ACTOR").map(c => c.name);
    const directors = credits.filter(c => c.id === movie.id && c.role === "DIRECTOR").map(c => c.name);

    clickedMovie = {
      ...movie,
      actors,
      directors
    };
  }
  
  $: xExtent = d3.extent(movieData, d => d.release_year);
  $: yExtent = [0, 10];
  
  $: xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([usableArea.left, usableArea.right])

  
  $: yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([usableArea.bottom, usableArea.top]);
  
  $: {
    if (xAxisScatter) d3.select(xAxisScatter).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    if (yAxisScatter) d3.select(yAxisScatter).call(d3.axisLeft(yScale));
  }
  
  // Filter by searchTerm and selectedActor
  $: filteredData = movieData.filter(d => {
    const matchesTitle = d.title.toLowerCase().includes(searchTerm.toLowerCase());
  
    let matchesActor = true;
    if (selectedActor && actorToMovies.has(selectedActor)) {
      matchesActor = actorToMovies.get(selectedActor).has(d.id);
    }

    const matchesType = 
    (d.type === "MOVIE" && showMovies) ||
    (d.type === "SHOW" && showShows);

    const matchesGenre = !selectedGenre || d.genres.includes(selectedGenre);

    return matchesTitle && matchesActor && matchesType && matchesGenre;
  });
  
  // Bar chart functions
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
        ? movieData.filter(item => yearFilter.includes(item.release_year.toString()))
        : movieData;
        
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
        ? movieData.filter(item => ageFilter.includes(item.age_certification))
        : movieData;
    
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
  }

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

<h1>Movie Data Visualization Dashboard</h1>

<div class="dashboard">
<section class="scatter-plot-section">
  <h2>IMDb Scores by Release Year</h2>
  
  <dl class="info tooltip" hidden={hoveredMovie === null} style="top: {tooltipPosition.y}px; left: {tooltipPosition.x}px" bind:this={tooltipScatter}>
    <dt>Title</dt>
    <dd>{hoveredMovie?.title}</dd>
    
    <dt>Year</dt>
    <dd>{hoveredMovie?.release_year}</dd>
    
    <dt>IMDb Score</dt>
    <dd>{hoveredMovie?.imdb_score}</dd>
  </dl>
  
  <div class="filters">
    <div class="filter-group">
      <input
        type="text"
        placeholder="Search movies..."
        bind:value={searchTerm}
        class="filter-input"
      />
    </div>

    <div class="filter-group">
      <input
        type="text"
        placeholder="Search actors..."
        bind:value={selectedActor}
        list="actors"
        class="filter-input"
      />
      
      <datalist id="actors">
        {#each actorList as actor}
          <option value={actor}>{actor}</option>
        {/each}
      </datalist>
    </div>

    <div class="filter-group">
      <input
        type="text"
        placeholder="Search genres..."
        bind:value={selectedGenre}
        list="genres"
        class="filter-input"
      />
      <datalist id="genres">
        {#each genreList as genre}
          <option value={genre}>{genre}</option>
        {/each}
      </datalist>
    </div>

    <label style="margin-right: 15px;">
      <input type="checkbox" bind:checked={showMovies}>
      Movies
    </label>
    
    <label>
      <input type="checkbox" bind:checked={showShows}>
      Shows
    </label>

  </div>
  
  <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgScatter}>
    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxisScatter} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxisScatter} />
  
    <g class="dots">
      {#each filteredData as d, index}
        <circle
          on:mouseenter={evt => dotInteraction(index, evt)}
          on:mouseleave={evt => dotInteraction(index, evt)}
          on:click={() => handleDotClick(index)}
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
    >Release Year</text>
  
    <text
      x={-usableArea.top - usableArea.height / 2}
      y={15}
      text-anchor="middle"
      font-size="12"
      transform="rotate(-90)"
    >IMDb Score</text>
  </svg>
</section>

{#if clickedMovie}
  <div class="movie-popup">
    <button class="close-btn" on:click={() => clickedMovie = null} title="Close">×</button>
    <h3>{clickedMovie.title} ({clickedMovie.release_year})</h3>
    
    <div class="movie-details">
      <p><strong>Type:</strong> {clickedMovie.type === "MOVIE" ? "Movie" : "TV Show"}</p>
      <p><strong>IMDb Score:</strong> {clickedMovie.imdb_score}</p>
      <p><strong>Age Certification:</strong> {clickedMovie.age_certification || 'N/A'}</p>
      
      {#if clickedMovie.directors.length > 0}
        <p><strong>Director(s):</strong> {clickedMovie.directors.join(', ')}</p>
      {:else}
        <p><strong>Director(s):</strong> N/A</p>
      {/if}
      
      {#if clickedMovie.actors.length > 0}
        <p><strong>Cast:</strong> {clickedMovie.actors.join(', ')}</p>
      {:else}
        <p><strong>Cast:</strong> N/A</p>
      {/if}
      
      {#if clickedMovie.genres.length > 0}
        <p><strong>Genres:</strong> {clickedMovie.genres.join(', ')}</p>
      {:else}
        <p><strong>Genres:</strong> N/A</p>
      {/if}
      
      <div class="movie-description">
        <strong>Description:</strong>
        <p>{clickedMovie.description}</p>
      </div>
    </div>
  </div>
{/if}

<section class="bar-charts-section">
  <div class="chart-controls">
    <button on:click={() => {
        clickedAges = [];
        clickedYears = [];
        processAllData();
    }} class="reset-button">Reset All Filters</button>
  </div>
  
  <div class="charts-container">
    <div class="chart">
      <h2>Movies by Age Certification</h2>
      <div class="chart-info">
        <span class="total-counter">Total Movies: {totalMoviesAge}</span>
      </div>
      
      <div class="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgAgeChart}>
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
          >Age Certification</text>
          
          <text
            x={-usableArea.top - usableArea.height / 2}
            y={15}
            text-anchor="middle"
            font-size="12"
            transform="rotate(-90)"
          >Number of Movies</text>
        </svg>
        
        <div class="fixed-tooltip" class:hidden={hoveredAgeIndex === -1} bind:this={ageTooltip}>
          <div class="tooltip-content">
            <strong>Certification:</strong> {hoveredAge.age_certification || ''}
            <strong>Movies:</strong> {hoveredAge.count || 0}
          </div>
        </div>
      </div>
    </div>

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
            <strong>Movies:</strong> {hoveredYear.count || 0}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</div>

<style>
/* GENERAL STYLES */
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f8f9fa;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
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

.dashboard {
  max-width: 1600px;
  margin: 0 auto;
}

/* SECTIONS */
section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 30px;
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

/* SCATTER PLOT */
.scatter-plot-section .filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-input {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
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

/* TOOLTIP STYLES */
.info.tooltip {
  display: grid;
  margin: 0;
  grid-template-columns: auto auto;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  backdrop-filter: blur(5px);
  padding: 10px;
  position: fixed;
  top: 1em;
  left: 1em;
  z-index: 100;
  font-size: 14px;
}

.info.tooltip[hidden]:not(:hover, :focus-within) {
  opacity: 0;
  visibility: hidden;
}

.info dt {
  grid-column: 1;
  font-weight: bold;
  color: #666;
  margin-right: 10px;
}

.info dd {
  grid-column: 2;
  margin: 0;
  padding: 0;
}

/* BAR CHARTS */
.charts-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
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

/* CONTROLS */
.chart-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.reset-button {
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.reset-button:hover {
  background: #e0e0e0;
}

/* RESPONSIVE LAYOUTS */
@media (max-width: 900px) {
  .charts-container {
    flex-direction: column;
  }
  
  .chart {
    width: 100%;
  }
}

/* Click Window */
.movie-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    padding: 1rem;
    width: 500px;
    max-height: 70vh; 
    overflow-y: auto;
    z-index: 999;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

.movie-popup h3 {
  margin-top: 0;
  color: #333;
  padding-right: 20px;
}

.movie-popup p {
  margin: 0.5rem 0;
  line-height: 1.4;
}

.movie-popup strong {
  color: #555;
}

.close-btn {
  position: absolute;
  right: 12px;
  top: 12px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.movie-details {
  padding: 10px 0;
}

.movie-description {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.movie-description p {
  margin-top: 5px;
  color: #444;
}

</style>